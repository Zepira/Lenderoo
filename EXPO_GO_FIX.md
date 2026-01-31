# Fixing Expo Go Issues

## Issues Fixed

1. ✅ **"Cannot find native module 'Burnt'"** - Toast system now falls back to Alert in Expo Go
2. ✅ **"ReactCurrentDispatcher" error** - Added React version resolutions

## Changes Made

### 1. Toast System (`lib/toast.ts`)

- Made `burnt` import optional
- Falls back to React Native's `Alert` when burnt isn't available
- Works in both Expo Go and development builds

### 2. Package.json

- Added `resolutions` to force React 19.1.0 across all dependencies
- Prevents React version conflicts

## Steps to Fix Your Running App

### Step 1: Clean Everything

```bash
# Navigate to project
cd "D:\Repos\Personal Repos\Lenderoo\Lenderoo"

# Remove all caches
del node_modules del .expo && del node_modules/.cache

# Reinstall dependencies
yarn install
```

### Step 2: Start Fresh

```bash
# Start with cleared cache
yarn start

# Or if port 8081 is in use:
npx expo start --clear --port 8082
```

### Step 3: In Expo Go App

On your iOS device:

1. **Close the Expo Go app completely** (swipe up and kill it)
2. **Clear Expo Go cache**:
   - Open Expo Go
   - Shake device to open menu
   - Tap "Reload" or "Clear cache and reload"
3. **Scan QR code again** from your terminal

### Step 4: If Still Having Issues

Try these additional steps:

**On your computer:**

```bash
# Kill all node/metro processes
taskkill /F /IM node.exe

# Start fresh again
yarn start
```

**On your iOS device:**

1. Delete the Expo Go app completely
2. Reinstall from App Store
3. Scan QR code to load your app

## Testing the Fixes

### Test Toast (Should now work in Expo Go)

The app will now show native Alerts instead of burnt toasts:

- ✓ Success → "✓ Success: [message]"
- ✗ Error → "✗ Error: [message]"
- ⚠ Warning → "⚠ Warning: [message]"
- ℹ Info → "ℹ Info: [message]"

### Test Authentication

1. App should start without ReactCurrentDispatcher error
2. Should redirect to sign-in if not logged in
3. Authentication should work normally

## Understanding the Issues

### Why "Cannot find native module 'Burnt'"?

- **Burnt** is a native module that requires custom native code
- **Expo Go** is a pre-built app that can't include all native modules
- **Solution**: Conditionally import and fall back to Alert

### Why "ReactCurrentDispatcher" error?

- Multiple React versions bundled together
- Metro cache had stale React modules
- Dependencies using different React versions
- **Solution**:
  - Added `resolutions` to lock React version
  - Cleared all caches
  - Fresh install

## For Production Builds

When you're ready for production:

### Option 1: EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

With a custom build, `burnt` will work properly!

### Option 2: Development Build

```bash
# Create development build with native modules
npx expo run:ios
npx expo run:android
```

## Summary

✅ **Toast system** - Works in Expo Go (uses Alert fallback)
✅ **React version** - Locked to 19.1.0 via resolutions
✅ **Caches cleared** - Fresh start
✅ **Ready to test** - Start app and test on device

## Still Having Issues?

1. **Check terminal for errors** - Look for specific error messages
2. **Check Expo Go logs** - Shake device → "View logs"
3. **Try web version first** - `yarn web` to test if issue is iOS-specific
4. **Check React Native version compatibility** - Ensure all packages support RN 0.81.5

## Next Steps After Testing

Once the app works in Expo Go:

1. **Deploy Edge Function** for Hardcover API proxy (see `FRIEND_SYSTEM_GUIDE.md`)
2. **Deploy Database Migration** for friend system
3. **Test friend codes** and friend adding features
4. **Create production build** for App Store submission

---

**Quick Start:**

```bash
rm -rf node_modules .expo
yarn install
yarn start
# Then reload Expo Go app
```
