import { useState } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import { useAds } from "@/contexts/AdsContext";
import { TAB_BAR_SPACE } from "@/lib/tab-bar";

/**
 * The one ad in the app (docs/ADS-PLAN.md): an anchored adaptive banner just
 * above the floating tab bar, on Home, Library and Explore only. Renders
 * nothing when ads are off or the banner fails to load (e.g. offline).
 *
 * Screens that show it pad their scroll content with useBannerSpace(), so the
 * last item can scroll clear of it and nothing jumps when an ad loads.
 */

/** Height reserved for the banner (anchored adaptive banners on phones are ~50–62). */
export const BANNER_SLOT_HEIGHT = 64;
const GAP_ABOVE_TAB_BAR = 8;

// Real ad units come from EAS env vars; development builds always use
// Google's test unit. A release build without a unit id shows no ads.
const UNIT_ID = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS,
      android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID,
    });

export function QuietBanner() {
  const insets = useSafeAreaInsets();
  const { showBanner, nonPersonalized } = useAds();
  const [failed, setFailed] = useState(false);

  if (!showBanner || !UNIT_ID || failed) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: insets.bottom + TAB_BAR_SPACE + GAP_ABOVE_TAB_BAR,
        height: BANNER_SLOT_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <BannerAd
        unitId={UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: nonPersonalized }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

/** Extra bottom padding for a screen that shows <QuietBanner> (0 when ads are off). */
export function useBannerSpace(): number {
  const { showBanner } = useAds();
  return showBanner && UNIT_ID ? BANNER_SLOT_HEIGHT + GAP_ABOVE_TAB_BAR : 0;
}
