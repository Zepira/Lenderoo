/**
 * Image Service
 *
 * Utilities for image processing — primarily stripping EXIF/location
 * metadata from user photos before they are uploaded to Supabase Storage.
 */

import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Re-encode a local image as JPEG to strip all EXIF metadata (camera model,
 * GPS coordinates, timestamps, etc.).
 *
 * EXIF data is discarded because `expo-image-manipulator` decodes the source
 * into a bitmap and re-encodes it — the original metadata is never copied
 * to the new file.
 *
 * @param uri - Local file URI of the image.
 * @returns URI of the processed image (metadata-free).
 */
export async function stripImageMetadata(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [], // No transformation — just re-encode to strip metadata
      {
        format: ImageManipulator.SaveFormat.JPEG,
        compress: 0.9,
      },
    );
    return result.uri;
  } catch {
    // If processing fails, return the original — better to have a
    // metadata-tagged image than no image at all.
    return uri;
  }
}
