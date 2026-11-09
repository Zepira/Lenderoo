import { describe, expect, it } from "@jest/globals";
import {
  GRACE_PERIOD_DAYS,
  graceStartFrom,
  isInGracePeriod,
  shouldShowAds,
  type AdsInputs,
} from "../should-show-ads";

const NOW = new Date("2026-11-20T10:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

const allowed: AdsInputs = {
  killSwitchEnabled: true,
  purchasedRemoveAds: false,
  graceStart: daysAgo(30),
  canRequestAds: true,
  online: true,
  now: NOW,
};

describe("shouldShowAds", () => {
  it("shows when every rule allows it", () => {
    expect(shouldShowAds(allowed)).toEqual({ show: true });
  });

  it("is off when the kill switch is off", () => {
    expect(shouldShowAds({ ...allowed, killSwitchEnabled: false })).toEqual({
      show: false,
      reason: "kill-switch-off",
    });
  });

  it("is off when the kill switch has never been fetched", () => {
    expect(shouldShowAds({ ...allowed, killSwitchEnabled: null })).toEqual({
      show: false,
      reason: "kill-switch-off",
    });
  });

  it("is off for anyone who bought Remove ads", () => {
    expect(shouldShowAds({ ...allowed, purchasedRemoveAds: true })).toEqual({
      show: false,
      reason: "purchased",
    });
  });

  it("is off during the grace period", () => {
    expect(shouldShowAds({ ...allowed, graceStart: daysAgo(2) })).toEqual({
      show: false,
      reason: "grace-period",
    });
  });

  it("is off when the grace start is unknown", () => {
    expect(shouldShowAds({ ...allowed, graceStart: null })).toEqual({
      show: false,
      reason: "grace-period",
    });
  });

  it("is off until consent allows ad requests", () => {
    expect(shouldShowAds({ ...allowed, canRequestAds: false })).toEqual({
      show: false,
      reason: "consent-pending",
    });
  });

  it("is off when offline", () => {
    expect(shouldShowAds({ ...allowed, online: false })).toEqual({
      show: false,
      reason: "offline",
    });
  });

  it("checks the kill switch before everything else", () => {
    expect(
      shouldShowAds({
        ...allowed,
        killSwitchEnabled: false,
        purchasedRemoveAds: true,
        graceStart: null,
        canRequestAds: false,
        online: false,
      }),
    ).toEqual({ show: false, reason: "kill-switch-off" });
  });
});

describe("isInGracePeriod", () => {
  it("is in the grace period just before it ends", () => {
    const start = new Date(NOW.getTime() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000 + 1);
    expect(isInGracePeriod(start, NOW)).toBe(true);
  });

  it("is out of the grace period exactly when it ends", () => {
    expect(isInGracePeriod(daysAgo(GRACE_PERIOD_DAYS), NOW)).toBe(false);
  });
});

describe("graceStartFrom", () => {
  it("uses the earlier of first open and account creation", () => {
    expect(graceStartFrom(daysAgo(1), daysAgo(40))).toEqual(daysAgo(40));
    expect(graceStartFrom(daysAgo(40), daysAgo(1))).toEqual(daysAgo(40));
  });

  it("uses whichever one is known", () => {
    expect(graceStartFrom(daysAgo(3), null)).toEqual(daysAgo(3));
    expect(graceStartFrom(null, daysAgo(3))).toEqual(daysAgo(3));
  });

  it("is null when neither is known", () => {
    expect(graceStartFrom(null, null)).toBeNull();
  });

  it("ignores invalid dates", () => {
    expect(graceStartFrom(new Date("nope"), daysAgo(3))).toEqual(daysAgo(3));
  });
});
