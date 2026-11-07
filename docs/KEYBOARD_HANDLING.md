# Keyboard Handling on Android

## The Problem

`TextInput` fields near the bottom of scrollable screens stayed hidden behind the software keyboard on Android. The user had to manually dismiss the keyboard to see what they were typing.

## Root Cause

React Native's New Architecture defaults to `adjustResize` as the `windowSoftInputMode` on Android. This makes the window **resize** when the keyboard opens, which shrinks the viewport. `KeyboardAwareScrollView` (from `react-native-keyboard-aware-scroll-view`) measures the keyboard via `Keyboard.addListener('keyboardDidShow')` and tries to scroll the focused input into view, but `adjustResize` changes the layout metrics simultaneously — the two fight each other. The scroll ends up short, and bottom inputs stay hidden.

## The Fix

Switch the activity's `windowSoftInputMode` from `adjustResize` to `adjustPan`:

```json
// app.json
{
  "expo": {
    "android": {
      "softwareKeyboardLayoutMode": "pan"
    }
  }
}
```

This tells Android to **pan** (translate) the window content upward instead of resizing it. `KeyboardAwareScrollView` can then measure the keyboard height accurately and scroll the focused input into view.

> **Why not `adjustResize` + `KeyboardAvoidingView`?**
> `KeyboardAvoidingView` with `behavior="padding"` works on iOS but has the same measurement conflict with `adjustResize` on Android. It's also unreliable inside React Native `<Modal>` components (which render as native Android Dialog windows and don't inherit `windowSoftInputMode` at all — those use `KeyboardAwareScrollView` with manual keyboard listeners instead).

## What `extraScrollHeight` Is (And Isn't)

`extraScrollHeight` is a **visual padding** prop on `KeyboardAwareScrollView`. It adds extra scroll offset above the keyboard so the focused input isn't pressed flush against it:

```tsx
<KeyboardAwareScrollView
  enableOnAndroid
  extraScrollHeight={24}  // 24px gap between input and keyboard
>
```

It is **not** a fix for broken scroll behavior. If inputs aren't scrolling into view, the problem is likely the `adjustResize`/`adjustPan` mismatch, not an insufficient `extraScrollHeight`.

## Pattern Used Across the App

Every screen with `TextInput` fields uses `KeyboardAwareScrollView` with consistent props:

```tsx
<KeyboardAwareScrollView
  keyboardShouldPersistTaps="handled"
  enableOnAndroid
  extraScrollHeight={24}
>
  {/* form fields */}
</KeyboardAwareScrollView>
```

For **full-screen forms** (auth, profile, add/edit items) — this is the standard pattern.

For **Modal-based sheets** with a `FlatList` (where `KeyboardAwareScrollView` can't be nested) — see friend picker in `app/item/[id].tsx` for the manual keyboard listener approach.

## What Was Tried (And Ruled Out)

| Approach | Result |
|----------|--------|
| `KeyboardAvoidingView` with `behavior="padding"` | Unreliable — same `adjustResize` conflict |
| `KeyboardAwareScrollView` with `extraScrollHeight={100}` | Worked but was compensating for the wrong problem |
| `react-native-keyboard-aware-scroll-view` on its own with `adjustResize` | Scrolled short — inputs stayed hidden |
| **`adjustPan` + default `extraScrollHeight={24}`** | **Correct solution** |

## Files Changed

| File | Change |
|------|--------|
| `app.json` | `softwareKeyboardLayoutMode`: `"resize"` → `"pan"` |
| `android/app/src/main/AndroidManifest.xml` | Generated from above (do not edit directly) |
| `app/(auth)/sign-in.tsx` | `KeyboardAvoidingView` → `KeyboardAwareScrollView`, `extraScrollHeight={24}` |
| `app/(auth)/sign-up.tsx` | Same, plus `contentContainerClassName="grow"` for top-aligned layout |
| `app/(auth)/forgot-password.tsx` | Same |
| `app/reset-password.tsx` | Same |
| `app/add-item/search.tsx` | `extraScrollHeight={24}` (consistent) |
| `app/add-item/book.tsx` | `extraScrollHeight={24}` (consistent) |
| `app/add-item/generic.tsx` | `extraScrollHeight={24}` (consistent) |
| `app/edit-item/generic.tsx` | `extraScrollHeight={24}` (consistent) |
| `app/edit-item/book.tsx` | `extraScrollHeight={24}` (consistent) |
| `app/profile.tsx` | `extraScrollHeight={24}` (consistent) |
| `app/add-friend.tsx` | `extraScrollHeight={24}` (consistent) |
| `app/(tabs)/friends/add-user-friend.tsx` | `extraScrollHeight={24}` (consistent) |
