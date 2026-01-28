# AsyncStorage "window is not defined" Error - Fix Guide

## Error Message
```
ReferenceError: window is not defined
at getValue (node_modules\@react-native-async-storage\async-storage\lib\commonjs\AsyncStorage.js:63:52)
```

## What Causes This

This error happens when:
1. **Metro bundler cache is corrupted** - Most common cause
2. **Platform detection fails** - AsyncStorage can't tell if it's web or native
3. **Stale node_modules** - Old dependencies cached

## Fix (Choose One)

### Fix 1: Clear Cache (Fastest - Try This First)

```bash
# Stop the app (Ctrl+C)
cd "D:\Repos\Personal Repos\Lenderoo\Lenderoo"

# Clear cache and restart
yarn start -c
```

**Then press `a` for Android or `i` for iOS when it starts.**

### Fix 2: Clean Metro Cache

```bash
cd "D:\Repos\Personal Repos\Lenderoo\Lenderoo"

# Delete cache folders
rd /s /q .expo
rd /s /q node_modules\.cache

# Start fresh
yarn start -c
```

### Fix 3: Nuclear Option (If Nothing Else Works)

```bash
cd "D:\Repos\Personal Repos\Lenderoo\Lenderoo"

# Delete everything
rd /s /q .expo
rd /s /q node_modules
del yarn.lock

# Reinstall
yarn install

# Start clean
yarn start -c
```

## After Starting

When Expo shows the menu:
- ✅ Press `a` for Android
- ✅ Press `i` for iOS
- ⚠️ **Don't press `w` for web** (web needs different setup)

## If Using Web Platform

AsyncStorage needs special handling for web. If you need web support:

1. **Option A: Use localStorage for web**
   - Add web-specific storage adapter
   - Configure Metro for web platform

2. **Option B: Use Supabase only** (Recommended)
   - Skip AsyncStorage for web
   - Use Supabase directly

## Verify It Works

After clearing cache, the app should start without errors.

### Quick Test
1. Start the app with `yarn start -c`
2. Press `a` or `i` to launch
3. Check if home screen loads
4. No error in console = Fixed! ✅

## Why `-c` Flag is Important

```bash
yarn start      # Uses old cache ❌
yarn start -c   # Clears cache ✅
```

The `-c` flag clears:
- Metro bundler cache
- Transform cache
- Module cache
- All cached files

**Always use `-c` when you see storage or "window" errors.**

## Common Mistakes

### ❌ Wrong
```bash
# Starting without clearing cache
yarn start

# Running web without web adapter
yarn web
```

### ✅ Correct
```bash
# Always clear cache first
yarn start -c

# Then choose platform
# Press 'a' for Android
# Press 'i' for iOS
```

## Still Not Working?

### Check These:

1. **Node.js version**
   ```bash
   node --version  # Should be 18.x or higher
   ```

2. **Yarn version**
   ```bash
   yarn --version  # Should be 4.5.0
   ```

3. **AsyncStorage installed**
   ```bash
   yarn list @react-native-async-storage/async-storage
   ```

4. **Platform you're trying to run**
   - Native (iOS/Android): Should work ✅
   - Web: Needs web adapter ⚠️

### Last Resort: Restart Everything

```bash
# Close all terminals
# Close VS Code
# Restart computer (clears all caches)

# Then:
cd "D:\Repos\Personal Repos\Lenderoo\Lenderoo"
yarn install
yarn start -c
```

## Prevention

To avoid this error in the future:

1. **Always use `-c` flag** when switching branches
2. **Clear cache** after `yarn install` or dependency updates
3. **Don't mix** web and native code without proper platform checks
4. **Update regularly**:
   ```bash
   yarn upgrade-interactive
   ```

## Understanding the Error

The error means AsyncStorage tried to access `window.localStorage` but `window` doesn't exist because:
- You're running on native (no `window` object)
- Metro bundled web code for native
- Cache has wrong platform code

Clearing cache fixes this by forcing Metro to re-bundle correctly.

## Web-Specific Setup (Advanced)

If you really need web support, you need to configure platform-specific storage:

```typescript
// lib/storage.ts
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const storage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      return localStorage.setItem(key, value);
    }
    return AsyncStorage.setItem(key, value);
  },
  // ... other methods
};
```

But for now, just use native platforms (iOS/Android).

## Success Checklist

After fixing:
- [ ] No "window is not defined" error
- [ ] App starts successfully
- [ ] Can navigate between screens
- [ ] Data persists after app restart
- [ ] No console errors

## Summary

**The Fix:**
```bash
yarn start -c
```

**Then press `a` or `i`, not `w`.**

That's it! 99% of the time, clearing cache solves this error.
