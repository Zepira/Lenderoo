# Image Upload Setup Guide

## Overview

Images are now properly saved to Supabase Storage! The system:
- ✅ Uploads photos from camera/gallery to Supabase Storage
- ✅ Downloads and saves external image URLs (e.g., book covers)
- ✅ Stores images in user-specific folders
- ✅ Returns permanent URLs that won't break

## Setup Steps

### Step 1: Install Required Dependency

```bash
yarn add expo-file-system
```

This is required for reading local image files before upload.

### Step 2: Run Storage Migration

Open Supabase SQL Editor and run:

**File**: `supabase/migrations/012_storage_setup.sql`

This creates:
- `item-images` storage bucket (public)
- Storage policies for user access
- Folder structure: `item-images/{user-id}/{filename}`

### Step 3: Verify Storage Bucket

1. Go to Supabase Dashboard → Storage
2. You should see `item-images` bucket
3. Click on it to verify policies are set

Expected policies:
- ✅ Users can upload item images
- ✅ Anyone can view item images
- ✅ Users can update their own images
- ✅ Users can delete their own images

## How It Works

### For User-Uploaded Photos (Camera/Gallery)

```
1. User picks image → Local file URI (file://...)
2. Validate (max 5MB, jpg/png/gif/webp)
3. Read as base64
4. Upload to Supabase Storage
5. Get public URL (https://...supabase.co/storage/...)
6. Save URL to database (images array)
```

### For External URLs (Book Covers, etc.)

```
1. User provides URL (https://covers.openlibrary.org/...)
2. Download image via fetch()
3. Upload to Supabase Storage
4. Get public URL
5. Save URL to database (images array)
```

### Database Storage

Images are stored in the `images` column as a TEXT array:

```json
{
  "images": [
    "https://[project].supabase.co/storage/v1/object/public/item-images/[user-id]/1707406234567-abc123.jpg"
  ]
}
```

## Updated Files

### 1. Storage Service (`lib/storage-service.ts`)

**New Functions**:
- `uploadItemImage(uri, userId)` - Main upload function
  - Detects if URI is local file or HTTP URL
  - Handles both cases appropriately
  - Returns Supabase Storage URL

- `uploadLocalImage(uri, userId)` - Upload local file
  - Reads file as base64
  - Converts to ArrayBuffer
  - Uploads to storage

- `downloadAndUploadImage(url, userId)` - Download external image
  - Fetches image from URL
  - Converts to ArrayBuffer
  - Uploads to storage

**Features**:
- Automatic URL detection (local vs HTTP vs already uploaded)
- Unique filenames with timestamps
- Content-type detection
- Error handling with detailed logs

### 2. Add Generic Item (`app/add-item/generic.tsx`)

**Changes**:
- ✅ Gets actual user ID (no more "demo-user")
- ✅ Validates images before upload
- ✅ Uploads image to Supabase Storage
- ✅ Shows "Uploading..." state
- ✅ Saves to `images` array (not `imageUrl`)
- ✅ Toast notifications for feedback
- ✅ Proper error handling

### 3. Add Book (`app/add-item/book.tsx`)

**Changes**:
- ✅ Gets actual user ID
- ✅ Downloads book cover from external URL
- ✅ Uploads to Supabase Storage
- ✅ Saves to `images` array
- ✅ Continues without image if upload fails
- ✅ Alert notification on image failure

## Testing

### Test 1: Upload Photo (Generic Item)

1. Open app → Add Item → Select category
2. Fill in item name
3. Click "Add Image" → Take Photo or Choose from Library
4. Select an image
5. Click "Add to Library"

**Expected**:
- ✅ "Uploading image..." toast appears
- ✅ "Item added successfully!" toast appears
- ✅ Image appears on item card
- ✅ Image URL in database starts with `https://...supabase.co/storage/`

**Console Logs**:
```
📤 Uploading image: file:///...
⬆️ Uploading to storage: [user-id]/[timestamp]-[random].jpg
✅ Image uploaded successfully: https://...
```

### Test 2: Book Cover (External URL)

1. Open app → Add Item → Books → Search for a book
2. Select a book (has cover image URL)
3. Click "Add to Library"

**Expected**:
- ✅ Image downloads from external URL
- ✅ Uploads to Supabase Storage
- ✅ Book appears with cover in library
- ✅ Cover URL in database is Supabase Storage URL

**Console Logs**:
```
🌐 Downloading image from URL: https://covers.openlibrary.org/...
⬇️ Downloading image from: https://...
⬆️ Uploading to storage: [user-id]/[timestamp]-[random].jpg
✅ Image downloaded and uploaded successfully: https://...
```

### Test 3: Error Handling

**Test 3a: Large File**
- Try uploading image > 5MB
- Should show error: "Image file is too large"

**Test 3b: Invalid Format**
- Try uploading non-image file
- Should show error: "Invalid image format"

**Test 3c: Network Error**
- Turn off internet
- Try adding item with image
- Should show clear error message

## Troubleshooting

### Issue: "expo-file-system not found"

**Solution**: Install the package
```bash
yarn add expo-file-system
```

### Issue: "Storage bucket not found"

**Solution**: Run migration 012
```sql
-- In Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;
```

### Issue: Images not uploading

**Check Console Logs**:
1. Look for `📤 Uploading image:` log
2. Check for error messages
3. Verify user is authenticated

**Common Causes**:
- RLS policies not set up (run migration 012)
- User not authenticated
- Network connectivity issues
- File too large (>5MB)

### Issue: Book covers not downloading

**Check**:
1. Image URL is accessible (test in browser)
2. CORS not blocking the request
3. Network connectivity

**Fallback**: Book will be added without cover image

### Issue: "Not authenticated" error

**Solution**:
1. Make sure user is logged in
2. Restart the app
3. Clear cache and sign in again

## File Structure in Storage

```
item-images/
├── user-123-abc/
│   ├── 1707406234567-abc123.jpg
│   ├── 1707406890123-def456.png
│   └── 1707407123456-ghi789.jpg
├── user-456-def/
│   ├── 1707408234567-jkl012.jpg
│   └── 1707409234567-mno345.png
└── ...
```

- Each user has their own folder
- Filenames are unique (timestamp + random string)
- Original file extension is preserved

## Security

### RLS Policies

**Upload**: Users can only upload to their own folder
```sql
bucket_id = 'item-images'
AND auth.uid()::text = (storage.foldername(name))[1]
```

**View**: Anyone can view (bucket is public)
- This is needed so friends can see item images
- Only the storage URLs are shared, not user folders

**Update/Delete**: Users can only modify their own images

### File Validation

- Maximum size: 5MB
- Allowed formats: JPG, PNG, GIF, WebP, HEIC
- Validated before upload

## Performance

- Images are served via Supabase CDN (global)
- Cached for fast loading
- Unique filenames prevent cache issues
- Lazy loading in UI

## Next Steps

After setup is complete:

1. ✅ Install expo-file-system
2. ✅ Run migration 012
3. ✅ Test adding item with photo
4. ✅ Test adding book with cover
5. ✅ Verify images appear correctly
6. ✅ Check Supabase Storage for uploaded files

Images should now work perfectly! 🎉
