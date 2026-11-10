/**
 * Consent for ads (docs/ADS-PLAN.md §2.5).
 *
 * - Google's UMP form: shown only where the law needs it (EEA/UK), before the
 *   first ad request. Elsewhere it isn't required and ads may be requested.
 * - Apple's App Tracking Transparency prompt: asked at most once, and only
 *   after the grace period (the caller decides when).
 * Anyone who says no gets non-personalised ads and is never asked again.
 */

import { Platform } from "react-native";
import { AdsConsent, AdsConsentStatus } from "react-native-google-mobile-ads";
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from "expo-tracking-transparency";

export interface ConsentResult {
  canRequestAds: boolean;
  /** Personalised ads allowed by UMP (or not required where the user is). */
  personalisedAllowed: boolean;
}

export async function gatherConsent(): Promise<ConsentResult> {
  try {
    await AdsConsent.requestInfoUpdate();
    const info = await AdsConsent.loadAndShowConsentFormIfRequired();
    if (!info.canRequestAds) return { canRequestAds: false, personalisedAllowed: false };
    if (info.status === AdsConsentStatus.NOT_REQUIRED) {
      return { canRequestAds: true, personalisedAllowed: true };
    }
    const choices = await AdsConsent.getUserChoices();
    return { canRequestAds: true, personalisedAllowed: choices.selectPersonalisedAds };
  } catch {
    // If consent can't be checked, don't request ads at all.
    return { canRequestAds: false, personalisedAllowed: false };
  }
}

/** iOS: asks once (if never asked) and returns whether tracking is allowed. */
export async function requestTrackingIfNeeded(): Promise<boolean> {
  if (Platform.OS !== "ios") return true;
  try {
    const current = await getTrackingPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const result = await requestTrackingPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}
