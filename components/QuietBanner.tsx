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
 * Home, Library and Explore only; on other tabs it slides away and the tab
 * bar slides back down. Renders nothing when ads are off or no ad loads.
 *
 * The floating tab bar renders this (app/(tabs)/_layout.tsx) and reads
 * useAdBarLift() for how far to lift itself; screens pad their content with
 * useBannerSpace().
 */

/** Tabs that show the ad bar (route names in app/(tabs)). */
export const AD_ROUTES = ["index", "library", "explore"];
const SLIDE_MS = 220;

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

/** Animated lift for the tab bar: the ad's height on ad tabs, 0 elsewhere. */
export function useAdBarLift(onAdRoute: boolean): Animated.Value {
  const adHeight = useLoadedAdHeight();
  const target = onAdRoute ? adHeight : 0;
  const lift = useRef(new Animated.Value(target)).current;
  useEffect(() => {
    Animated.timing(lift, { toValue: target, duration: SLIDE_MS, useNativeDriver: true }).start();
  }, [lift, target]);
  return lift;
}

export function AdBar({ lift }: { lift: Animated.Value }) {
  const insets = useSafeAreaInsets();
  const { activeTheme } = useThemeContext();
  const theme = activeTheme === "dark" ? THEME.dark : THEME.light;
  const { showBanner, nonPersonalized, adHeight, setAdHeight } = useAds();
  const [failed, setFailed] = useState(false);

  if (!showBanner || !UNIT_ID || failed) return null;

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
      <BannerAd
        unitId={UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: nonPersonalized }}
        onAdLoaded={({ height }) => setAdHeight(Math.ceil(height))}
        onAdFailedToLoad={() => {
          setFailed(true);
          setAdHeight(0);
        }}
      />
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
