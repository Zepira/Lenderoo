/**
 * The ads kill switch (app_config ads.enabled) and this device's first-open
 * date, both remembered in AsyncStorage. See docs/ADS-PLAN.md.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { STORAGE_KEYS } from "@/lib/constants";

/** The last kill-switch value we saw; null if it has never been fetched. */
export async function getCachedAdsEnabled(): Promise<boolean | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ADS_ENABLED);
    return raw === null ? null : raw === "true";
  } catch {
    return null;
  }
}

/**
 * Reads ads.enabled from Supabase and caches it. On any failure returns the
 * cached value (or null), so being offline never turns ads on.
 */
export async function fetchAdsEnabled(): Promise<boolean | null> {
  try {
    const { data, error } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "ads")
      .maybeSingle();
    if (error) throw error;
    const enabled = data?.value?.enabled === true;
    await AsyncStorage.setItem(STORAGE_KEYS.ADS_ENABLED, String(enabled));
    return enabled;
  } catch {
    return getCachedAdsEnabled();
  }
}

/** The first time the app was opened on this device, recorded on first call. */
export async function getFirstOpenedAt(): Promise<Date | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_OPENED_AT);
    if (raw) return new Date(raw);
    const now = new Date();
    await AsyncStorage.setItem(STORAGE_KEYS.FIRST_OPENED_AT, now.toISOString());
    return now;
  } catch {
    return null;
  }
}
