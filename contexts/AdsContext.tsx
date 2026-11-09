/**
 * AdsContext — decides, once for the whole app, whether the quiet banner may
 * show (docs/ADS-PLAN.md). Screens read it through useAds(); only
 * <QuietBanner> and useBannerSpace() should need it.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import mobileAds, { MaxAdContentRating } from "react-native-google-mobile-ads";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAdsEnabled, getCachedAdsEnabled, getFirstOpenedAt } from "@/lib/ads/remote";
import { gatherConsent, requestTrackingIfNeeded } from "@/lib/ads/consent";
import { graceStartFrom, isInGracePeriod, shouldShowAds } from "@/lib/ads/should-show-ads";

interface AdsState {
  /** The banner may show (it still hides itself if no ad loads). */
  showBanner: boolean;
  /** Only request non-personalised ads (consent or tracking declined). */
  nonPersonalized: boolean;
}

const AdsContext = createContext<AdsState>({ showBanner: false, nonPersonalized: true });

// Development only: EXPO_PUBLIC_ADS_DEV_FORCE=1 skips the kill switch and the
// grace period so the banner (Google's test ads) can be checked.
const DEV_FORCE = __DEV__ && process.env.EXPO_PUBLIC_ADS_DEV_FORCE === "1";

export function AdsProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const [killSwitch, setKillSwitch] = useState<boolean | null>(null);
  const [firstOpenedAt, setFirstOpenedAt] = useState<Date | null>(null);
  const [consent, setConsent] = useState<{ canRequestAds: boolean; personalised: boolean } | null>(
    null,
  );

  // Kill switch: cached value first, then a fresh read; again on foreground.
  useEffect(() => {
    getCachedAdsEnabled().then((cached) => setKillSwitch((v) => v ?? cached));
    getFirstOpenedAt().then(setFirstOpenedAt);
    fetchAdsEnabled().then(setKillSwitch);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchAdsEnabled().then(setKillSwitch);
    });
    return () => sub.remove();
  }, []);

  const purchasedRemoveAds = false; // Wired up with the Remove ads purchase (docs/ADS-PLAN.md P1).
  const graceStart = DEV_FORCE ? new Date(0) : graceStartFrom(firstOpenedAt, appUser?.createdAt ?? null);
  const eligible =
    (DEV_FORCE || killSwitch === true) &&
    !purchasedRemoveAds &&
    !isInGracePeriod(graceStart, new Date());

  // Consent and SDK start only once ads could actually show.
  useEffect(() => {
    if (!eligible || consent) return;
    let cancelled = false;
    (async () => {
      const ump = await gatherConsent();
      const tracking = ump.canRequestAds ? await requestTrackingIfNeeded() : false;
      if (ump.canRequestAds) {
        await mobileAds().setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating.PG,
          tagForChildDirectedTreatment: false,
        });
        await mobileAds().initialize();
      }
      if (!cancelled) {
        setConsent({ canRequestAds: ump.canRequestAds, personalised: ump.personalisedAllowed && tracking });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eligible, consent]);

  const decision = shouldShowAds({
    killSwitchEnabled: DEV_FORCE ? true : killSwitch,
    purchasedRemoveAds,
    graceStart,
    canRequestAds: consent?.canRequestAds ?? false,
    // Offline: the banner fails to load and hides itself.
    online: true,
    now: new Date(),
  });

  return (
    <AdsContext.Provider
      value={{ showBanner: decision.show, nonPersonalized: !(consent?.personalised ?? false) }}
    >
      {children}
    </AdsContext.Provider>
  );
}

export function useAds(): AdsState {
  return useContext(AdsContext);
}
