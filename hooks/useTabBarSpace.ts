import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TAB_BAR_SPACE } from '@/lib/tab-bar'
import { useBannerSpace } from '@/components/QuietBanner'

/** Breathing room between the last row and whatever floats over it. */
const GAP = 16

/**
 * Bottom padding for a scroll view on a tab screen: the floating tab bar's real height on this
 * device (its size plus the bottom safe area, which runs from 0 to ~48 depending on the phone and
 * Android's navigation mode), plus the ad bar while it's showing (`banner: false` on screens that
 * never show it). Never hardcode this
 * (studio LEARNINGS L-L4: a fixed 160 hid the last row on 3-button Android).
 */
export function useTabBarSpace({ banner: withBanner = true } = {}): number {
  const insets = useSafeAreaInsets()
  const banner = useBannerSpace()
  return insets.bottom + TAB_BAR_SPACE + (withBanner ? banner : 0) + GAP
}

/** Bottom padding for a screen with no tab bar: the safe area, the ad bar if any, and a gap. */
export function useBottomSpace({ banner: withBanner = true } = {}): number {
  const insets = useSafeAreaInsets()
  const banner = useBannerSpace()
  return insets.bottom + (withBanner ? banner : 0) + GAP * 2
}
