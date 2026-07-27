/**
 * Storage Service
 *
 * Handles image uploads to Supabase Storage
 */

import { Platform } from 'react-native';
import { supabase } from '../supabase';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { stripImageMetadata } from './image';

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
    // If it's already a Supabase Storage URL, return as-is
    if (uri.includes('supabase.co/storage')) {
      return uri;
    }

    // If it's an HTTP(S) URL
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      if (uploadExternalUrls) {
        // Download and re-upload (slower but ensures we control the image)
        try {
          return await downloadAndUploadImage(uri, userId);
        } catch (error: any) {
          return uri;
        }
      } else {
        // Use external URL directly (faster, recommended for book covers)
        return uri;
      }
    }

    // It's a local file URI - upload it
    return await uploadLocalImage(uri, userId);
  } catch (error) {
    throw error;
  }
}

/**
 * Compress and resize image before upload
 */
async function compressImage(uri: string): Promise<string> {
  try {
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

    return manipResult.uri;
  } catch (error) {
    return uri; // Fallback to original if compression fails
  }
}

/**
 * Read a local (already-compressed) image file and upload it to the given
 * storage bucket/path, returning its public URL. Shared by every
 * bucket-specific uploader below.
 */
async function uploadImageBuffer(
  compressedUri: string,
  bucket: string,
  filePath: string
): Promise<string> {
  const contentType = 'image/jpeg';

  let arrayBuffer: ArrayBuffer;

  if (Platform.OS === 'web') {
    // On web, blob: and data: URIs can be fetched directly by the browser
    const response = await fetch(compressedUri);
    if (!response.ok) throw new Error('Failed to read selected image');
    arrayBuffer = await response.arrayBuffer();
  } else {
    // On native, use expo-file-system to read the local file
    const base64 = await FileSystem.readAsStringAsync(compressedUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    arrayBuffer = decode(base64);
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Upload a local file to Supabase Storage
 */
async function uploadLocalImage(uri: string, userId: string): Promise<string> {
  // Compress image first to improve upload speed
  const compressedUri = await compressImage(uri);

  // Generate unique filename
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
  const filePath = `${userId}/${fileName}`;

  return uploadImageBuffer(compressedUri, BUCKET_NAME, filePath);
}

/**
 * Download an image from URL and upload to Supabase Storage
 */
async function downloadAndUploadImage(url: string, userId: string): Promise<string> {
  const isWeb = typeof document !== "undefined";

  let sourceUri: string;
  let tempFileToClean: string | null = null;

  if (isWeb) {
    // Web: fetch via CORS proxy → base64 data URI
    // (data URIs are the documented format for expo-image-manipulator on web)
    const imageData = await downloadImageWeb(url);
    const blob = new Blob([imageData.data], { type: imageData.contentType });
    sourceUri = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } else {
    // Mobile: download to a temporary file
    const filename = `${Date.now()}-download.jpg`;
    sourceUri = `${FileSystem.cacheDirectory}${filename}`;
    const downloadResult = await FileSystem.downloadAsync(url, sourceUri);
    if (downloadResult.status !== 200) {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }
    tempFileToClean = sourceUri;
  }

  // Strip EXIF metadata by re-encoding as JPEG (no resize)
  const processedUri = await stripImageMetadata(sourceUri);

  // Clean up the original downloaded file (mobile only)
  if (tempFileToClean) {
    FileSystem.deleteAsync(tempFileToClean, { idempotent: true }).catch(() => {});
  }

  // Generate unique filename and upload (stripImageMetadata always outputs JPEG)
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
  const filePath = `${userId}/${fileName}`;
  return uploadImageBuffer(processedUri, BUCKET_NAME, filePath);
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

      return { data: arrayBuffer, contentType, extension };
    } catch (error: any) {
      lastError = error;
      continue; // Try next proxy
    }
  }

  throw lastError || new Error('Failed to download image');
}


const FEEDBACK_SCREENSHOTS_BUCKET = 'feedback-screenshots';

/**
 * Upload a feedback screenshot. Unlike item/avatar uploads this is not
 * scoped to a userId folder — feedback is anonymous, and a userId-prefixed
 * path would itself identify the submitter.
 *
 * @param uri - Local file URI from the image picker
 * @returns Public URL of the uploaded screenshot
 */
export async function uploadFeedbackScreenshot(uri: string): Promise<string> {
  const compressedUri = await compressImage(uri);
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
  return uploadImageBuffer(compressedUri, FEEDBACK_SCREENSHOTS_BUCKET, fileName);
}

/**
 * Upload multiple feedback screenshots.
 *
 * @param uris - Array of local file URIs
 * @returns Array of public URLs
 */
export async function uploadFeedbackScreenshots(uris: string[]): Promise<string[]> {
  return Promise.all(uris.map(uploadFeedbackScreenshot));
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

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  } catch (error) {
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
    if (Platform.OS === 'web') {
      // On web, blob: URIs are already in memory — just check size via fetch
      const response = await fetch(uri);
      if (!response.ok) throw new Error('Image file does not exist');
      const blob = await response.blob();
      const maxSize = 5 * 1024 * 1024;
      if (blob.size > maxSize) {
        throw new Error('Image file is too large. Maximum size is 5MB.');
      }
      return true;
    }

    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists) {
      throw new Error('Image file does not exist');
    }

    const maxSize = 5 * 1024 * 1024;
    if (fileInfo.size && fileInfo.size > maxSize) {
      throw new Error('Image file is too large. Maximum size is 5MB.');
    }

    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
    const extension = uri.split('.').pop()?.toLowerCase();
    if (!extension || !validExtensions.includes(extension)) {
      throw new Error('Invalid image format. Supported formats: JPG, PNG, GIF, WebP, HEIC');
    }

    return true;
  } catch (error) {
    throw error;
  }
}
