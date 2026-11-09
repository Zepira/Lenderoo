import { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import { useAds } from "@/contexts/AdsContext";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";

/**
 * The one ad in the app (docs/ADS-PLAN.md): a full-width bar docked to the
 * bottom edge, with the floating tab bar lifted to sit just above it. Shown on
 * browsing screens only (see isAdScreen; Borrowed renders its own); elsewhere
 * the tab bar sits in its usual place. Renders nothing when ads are off or no
 * ad loads.
 *
 * The floating tab bar renders this (app/(tabs)/_layout.tsx) and reads
 * useAdBarLift() for how far to lift itself; screens pad their content with
 * useBannerSpace().
 */

/**
 * Whether a tab screen shows the ad bar. Browsing screens only: never Settings,
 * and never the Add Friend form (docs/ADS-PLAN.md §2.2).
 * `tab` is the route in app/(tabs); `nested` the screen inside a tab's stack.
 */
export function isAdScreen(tab: string | undefined, nested: string | undefined): boolean {
  if (tab === "friends") return nested !== "add-user-friend";
  return tab === "index" || tab === "library" || tab === "explore";
}
const SLIDE_MS = 220;
/** After a failed load (no fill, offline), try again this much later. */
const RETRY_MS = 60_000;

// Real ad units come from EAS env vars; development builds always use
// Google's test unit. A release build without a unit id shows no ads.
const UNIT_ID = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS,
      android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID,
    });

/**
 * Height of the loaded ad (0 until one loads, or if ads are off / it failed).
 * The bar is this plus the bottom safe area.
 */
function useLoadedAdHeight() {
  const { adHeight } = useAds();
  return UNIT_ID ? adHeight : 0;
}

/** Animated lift for the tab bar: the ad's height while the bar shows, else 0. */
export function useAdBarLift(visible: boolean): Animated.Value {
  const adHeight = useLoadedAdHeight();
  const target = visible ? adHeight : 0;
  const lift = useRef(new Animated.Value(target)).current;
  useEffect(() => {
    Animated.timing(lift, { toValue: target, duration: SLIDE_MS, useNativeDriver: true }).start();
  }, [lift, target]);
  return lift;
}

/**
 * The ad only exists while it's on screen (`visible`): it unmounts on other
 * tabs and when a screen opens over the tabs, so a hidden banner never loads
 * or refreshes (AdMob counts that as an impression nobody saw). It reloads
 * when the screen comes back and slides in once loaded.
 */
export function AdBar({ lift, visible }: { lift: Animated.Value; visible: boolean }) {
  const insets = useSafeAreaInsets();
  const { activeTheme } = useThemeContext();
  const theme = activeTheme === "dark" ? THEME.dark : THEME.light;
  const { showBanner, nonPersonalized, adHeight, setAdHeight } = useAds();
  // After a failed load, wait RETRY_MS, then remount the BannerAd (new key),
  // which requests a fresh ad.
  const [attempt, setAttempt] = useState(0);
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => {
      setWaiting(false);
      setAttempt((a) => a + 1);
    }, RETRY_MS);
    return () => clearTimeout(timer);
  }, [waiting]);

  useEffect(() => {
    if (!visible) setAdHeight(0);
  }, [visible, setAdHeight]);

  if (!showBanner || !UNIT_ID || !visible) return null;

  const barHeight = adHeight + insets.bottom;
  return (
    <Animated.View
      style={[
        styles.bar,
        {
          height: barHeight || 1,
          paddingBottom: insets.bottom,
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          // Fully hidden below the screen when lift is 0, flush at the bottom
          // when lift equals the ad height.
          transform: [
            {
              translateY: lift.interpolate({
                inputRange: [0, Math.max(adHeight, 1)],
                outputRange: [barHeight, 0],
                extrapolate: "clamp",
              }),
            },
          ],
        },
      ]}
    >
      {!waiting && (
        <BannerAd
          key={attempt}
          unitId={UNIT_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: nonPersonalized }}
          onAdLoaded={({ height }) => setAdHeight(Math.ceil(height))}
          onAdFailedToLoad={() => {
            // Hide the bar (the tab bar drops back down) and retry later.
            setAdHeight(0);
            setWaiting(true);
          }}
        />
      )}
    </Animated.View>
  );
}

/** Extra bottom padding for a screen on an ad tab (0 when no ad is showing). */
export function useBannerSpace(): number {
  return useLoadedAdHeight();
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 998,
  },
});
