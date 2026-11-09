/**
 * "Remove ads" — a one-off, non-consumable purchase (docs/ADS-PLAN.md §3).
 *
 * Scaffolding only: purchaseRemoveAds() and restorePurchases() aren't wired to
 * a store yet, and everything that calls them is hidden behind
 * FEATURES.ENABLE_REMOVE_ADS. Wire them up (plan step P1) once the Paid Apps
 * agreement and merchant account are active; there's no IAP library in the
 * repo yet, so ask before adding one.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/lib/constants";

export const REMOVE_ADS_PRODUCT_ID = "lenderoo_remove_ads";

/** Whether this device has a Remove ads purchase on record. */
export async function getRemoveAdsPurchased(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEYS.REMOVE_ADS_PURCHASED)) === "true";
  } catch {
    return false;
  }
}

/** Records a completed purchase or restore on this device. */
export async function recordRemoveAdsPurchased(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.REMOVE_ADS_PURCHASED, "true");
}

const NOT_SET_UP = "Purchases aren't set up yet.";

/** Buys Remove ads. Returns true once purchased. */
export async function purchaseRemoveAds(): Promise<boolean> {
  // P1: request REMOVE_ADS_PRODUCT_ID from the store; on success call
  // recordRemoveAdsPurchased() and return true.
  throw new Error(NOT_SET_UP);
}

/** Restores a Remove ads purchase made on another phone. Returns true if found. */
export async function restorePurchases(): Promise<boolean> {
  // P1: query the store for REMOVE_ADS_PRODUCT_ID, then record it if owned.
  throw new Error(NOT_SET_UP);
}
