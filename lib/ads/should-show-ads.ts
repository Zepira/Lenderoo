/**
 * Whether the quiet banner may show (docs/ADS-PLAN.md §2). Pure: no React
 * Native, network or storage, so every rule is unit tested.
 */

export const GRACE_PERIOD_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type AdsDecision =
  | { show: true }
  | {
      show: false;
      reason:
        | "kill-switch-off"
        | "purchased"
        | "grace-period"
        | "consent-pending"
        | "offline";
    };

export interface AdsInputs {
  /** app_config ads.enabled; null if it has never been fetched (= off). */
  killSwitchEnabled: boolean | null;
  /** The user bought "Remove ads". */
  purchasedRemoveAds: boolean;
  /** Start of the grace period; null if unknown yet (= still in it). */
  graceStart: Date | null;
  /** Google's consent flow finished and allows ad requests. */
  canRequestAds: boolean;
  online: boolean;
  now: Date;
}

export function shouldShowAds(inputs: AdsInputs): AdsDecision {
  if (inputs.killSwitchEnabled !== true) return { show: false, reason: "kill-switch-off" };
  if (inputs.purchasedRemoveAds) return { show: false, reason: "purchased" };
  if (isInGracePeriod(inputs.graceStart, inputs.now)) {
    return { show: false, reason: "grace-period" };
  }
  if (!inputs.canRequestAds) return { show: false, reason: "consent-pending" };
  if (!inputs.online) return { show: false, reason: "offline" };
  return { show: true };
}

export function isInGracePeriod(graceStart: Date | null, now: Date): boolean {
  if (!graceStart) return true;
  return now.getTime() - graceStart.getTime() < GRACE_PERIOD_DAYS * DAY_MS;
}

/**
 * The grace period starts at the earlier of the first time the app was opened
 * on this device and when the account was created, so reinstalling (or a new
 * phone) doesn't restart it for an existing account.
 */
export function graceStartFrom(
  firstOpenedAt: Date | null,
  accountCreatedAt: Date | null,
): Date | null {
  const dates = [firstOpenedAt, accountCreatedAt].filter(
    (d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()),
  );
  if (dates.length === 0) return null;
  return new Date(Math.min(...dates.map((d) => d.getTime())));
}
