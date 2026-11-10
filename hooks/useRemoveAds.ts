import { useState } from "react";
import { useAds } from "@/contexts/AdsContext";
import { purchaseRemoveAds, restorePurchases } from "@/lib/ads/remove-ads";
import * as toast from "@/lib/toast";

/** Buy / restore "Remove ads", with toasts. Only shown when FEATURES.ENABLE_REMOVE_ADS. */
export function useRemoveAds() {
  const { markRemoveAdsPurchased } = useAds();
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<boolean>, success: string, notFound?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      if (await action()) {
        markRemoveAdsPurchased();
        toast.success(success);
      } else if (notFound) {
        toast.info(notFound);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    buy: () => run(purchaseRemoveAds, "Thanks for supporting Lenderoo! Ads are gone."),
    restore: () =>
      run(restorePurchases, "Purchase restored. Ads are gone.", "No Remove ads purchase found."),
  };
}
