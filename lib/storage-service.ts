/**
 * Storage Service
 *
 * Handles image uploads to Supabase Storage
 */

import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';

const BUCKET_NAME = 'item-images';
const MAX_IMAGE_WIDTH = 1200; // Max width in pixels
const MAX_IMAGE_HEIGHT = 1200; // Max height in pixels
const COMPRESSION_QUALITY = 0.8; // 80% quality

/**
 * Upload an image to Supabase Storage
 *
 * @param uri - Local file URI from image picker or HTTP(S) URL
 * @param userId - ID of the user uploading the image
 * @param uploadExternalUrls - If false, external URLs are used directly without re-uploading (faster)
 * @returns Public URL of the uploaded image
 */
export async function uploadItemImage(
  uri: string,
  userId: string,
  uploadExternalUrls: boolean = false
): Promise<string> {
  try {
    console.log('📤 Processing image:', uri);

    // If it's already a Supabase Storage URL, return as-is
    if (uri.includes('supabase.co/storage')) {
      console.log('✅ Already a Supabase Storage URL, skipping upload');
      return uri;
    }

    // If it's an HTTP(S) URL
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      if (uploadExternalUrls) {
        // Download and re-upload (slower but ensures we control the image)
        console.log('🌐 Downloading and re-uploading external URL...');
        try {
          return await downloadAndUploadImage(uri, userId);
        } catch (error: any) {
          console.warn('⚠️ Failed to download/upload, using URL directly:', error.message);
          return uri;
        }
      } else {
        // Use external URL directly (faster, recommended for book covers)
        console.log('🔗 Using external URL directly (no upload needed)');
        return uri;
      }
    }

    // It's a local file URI - upload it
    return await uploadLocalImage(uri, userId);
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw error;
  }
}

/**
 * Compress and resize image before upload
 */
async function compressImage(uri: string): Promise<string> {
  try {
    console.log('🗜️ Compressing image...');

    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [
        // Resize to max dimensions while maintaining aspect ratio
        {
          resize: {
            width: MAX_IMAGE_WIDTH,
            height: MAX_IMAGE_HEIGHT,
          },
        },
      ],
      {
        compress: COMPRESSION_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log('✅ Image compressed:', manipResult.uri);
    return manipResult.uri;
  } catch (error) {
    console.warn('⚠️ Image compression failed, using original:', error);
    return uri; // Fallback to original if compression fails
  }
}

/**
 * Upload a local file to Supabase Storage
 */
async function uploadLocalImage(uri: string, userId: string): Promise<string> {
  // Compress image first to improve upload speed
  const compressedUri = await compressImage(uri);

  // Generate unique filename
  const fileExt = 'jpg'; // Always use jpg after compression
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // Read the file as base64
  const base64 = await FileSystem.readAsStringAsync(compressedUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convert base64 to ArrayBuffer
  const arrayBuffer = decode(base64);

  // Determine content type
  const contentType = 'image/jpeg';

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error('❌ Upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  console.log('✅ Image uploaded successfully:', publicUrl);

  return publicUrl;
}

/**
 * Download an image from URL and upload to Supabase Storage
 */
async function downloadAndUploadImage(url: string, userId: string): Promise<string> {
  try {
    console.log('⬇️ Downloading image from:', url);

    // Try CORS proxy for web, direct download for mobile
    const imageData = await downloadImageData(url);

    // Generate unique filename
    const fileExt = imageData.extension;
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    console.log('⬆️ Uploading to storage:', filePath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, imageData.data, {
        contentType: imageData.contentType,
        upsert: false,
      });

    if (error) {
      console.error('❌ Upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    console.log('✅ Image downloaded and uploaded successfully:', publicUrl);

    return publicUrl;
  } catch (error) {
    console.error('❌ Error downloading/uploading image:', error);
    throw error;
  }
}

/**
 * Download image data from URL (handles both mobile and web)
 */
async function downloadImageData(url: string): Promise<{
  data: ArrayBuffer;
  contentType: string;
  extension: string;
}> {
  // Check if we're on web or mobile
  const isWeb = typeof document !== 'undefined';

  if (isWeb) {
    // Web: Use CORS proxy + fetch
    return await downloadImageWeb(url);
  } else {
    // Mobile: Use expo-file-system
    return await downloadImageMobile(url);
  }
}

/**
 * Download image on web using CORS proxy
 */
async function downloadImageWeb(url: string): Promise<{
  data: ArrayBuffer;
  contentType: string;
  extension: string;
}> {
  // Try multiple CORS proxy services in order of preference
  const corsProxies = [
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    url, // Last resort: try direct (might work for some domains)
  ];

  let lastError: Error | null = null;

  for (const proxyUrl of corsProxies) {
    try {
      console.log('🌐 Trying URL:', proxyUrl.includes('corsproxy') ? 'via CORS proxy' : 'direct');

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/*',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get content type
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const extension = contentType.split('/')[1]?.split(';')[0] || 'jpg';

      // Convert to ArrayBuffer
      const blob = await response.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      console.log('✅ Downloaded via web');
      return { data: arrayBuffer, contentType, extension };
    } catch (error: any) {
      console.warn(`⚠️ Failed with this method:`, error.message);
      lastError = error;
      continue; // Try next proxy
    }
  }

  throw lastError || new Error('Failed to download image');
}

/**
 * Download image on mobile using expo-file-system
 */
async function downloadImageMobile(url: string): Promise<{
  data: ArrayBuffer;
  contentType: string;
  extension: string;
}> {
  // Download to temporary location
  const filename = `${Date.now()}-temp.jpg`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  console.log('📱 Downloading to:', fileUri);

  const downloadResult = await FileSystem.downloadAsync(url, fileUri);

  if (downloadResult.status !== 200) {
    throw new Error(`Download failed with status ${downloadResult.status}`);
  }

  // Determine content type from headers or URL
  const contentType = downloadResult.headers['content-type'] ||
                       downloadResult.headers['Content-Type'] ||
                       'image/jpeg';
  const extension = contentType.split('/')[1]?.split(';')[0] ||
                    url.split('.').pop()?.toLowerCase() ||
                    'jpg';

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convert to ArrayBuffer
  const arrayBuffer = decode(base64);

  // Clean up temp file
  await FileSystem.deleteAsync(fileUri, { idempotent: true });

  console.log('✅ Downloaded via mobile');
  return { data: arrayBuffer, contentType, extension };
}

/**
 * Upload multiple images
 *
 * @param uris - Array of local file URIs
 * @param userId - ID of the user uploading the images
 * @returns Array of public URLs
 */
export async function uploadItemImages(
  uris: string[],
  userId: string
): Promise<string[]> {
  const uploadPromises = uris.map(uri => uploadItemImage(uri, userId));
  return Promise.all(uploadPromises);
}

/**
 * Delete an image from Supabase Storage
 *
 * @param imageUrl - Public URL of the image to delete
 */
export async function deleteItemImage(imageUrl: string): Promise<void> {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/');
    const bucketIndex = urlParts.indexOf(BUCKET_NAME);
    if (bucketIndex === -1) {
      throw new Error('Invalid image URL');
    }

    const filePath = urlParts.slice(bucketIndex + 1).join('/');

    console.log('🗑️ Deleting image:', filePath);

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('❌ Delete error:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }

    console.log('✅ Image deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    throw error;
  }
}

/**
 * Delete multiple images
 *
 * @param imageUrls - Array of public URLs to delete
 */
export async function deleteItemImages(imageUrls: string[]): Promise<void> {
  const deletePromises = imageUrls.map(url => deleteItemImage(url));
  await Promise.all(deletePromises);
}

/**
 * Get content type from file extension
 */
function getContentType(extension: string): string {
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  };

  return contentTypes[extension.toLowerCase()] || 'image/jpeg';
}

/**
 * Validate image file
 *
 * @param uri - Local file URI
 * @returns true if valid, throws error if invalid
 */
export async function validateImage(uri: string): Promise<boolean> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists) {
      throw new Error('Image file does not exist');
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (fileInfo.size && fileInfo.size > maxSize) {
      throw new Error('Image file is too large. Maximum size is 5MB.');
    }

    // Check file extension
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
    const extension = uri.split('.').pop()?.toLowerCase();

    if (!extension || !validExtensions.includes(extension)) {
      throw new Error('Invalid image format. Supported formats: JPG, PNG, GIF, WebP, HEIC');
    }

    return true;
  } catch (error) {
    console.error('❌ Image validation error:', error);
    throw error;
  }
}
