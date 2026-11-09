# Lenderoo — ads plan (quiet banner + "Remove ads")

_Decided with Alana, 9 Nov 2026. All money AUD. Status: built (A2–A4, P1 scaffolding), off behind the kill switch; waiting on AdMob setup (A1) and store answers (A5)._

**Changes agreed while building (9 Nov 2026):** the banner is a full-width bar
docked to the bottom edge with the floating tab bar resting on it (a banner
floating above the tab bar looked like it was hovering). It shows on Home,
Library, Explore, Friends, a friend's profile and Borrowed; never Settings or
the Add Friend form (§5 updated below). Google's adaptive size is kept. The
grace period starts at the earlier of first open and account creation (no new
profile column). No custom screen before Apple's tracking prompt.

## 1. Goal

A small, steady income built in so Lenderoo can pay its own hosting if costs go up (Supabase Pro ≈ A$36/month), **without making the app feel cheap**. Expect little at first: roughly A$5–20/month per 1,000 installed users from banners (≈ A$1.40 eCPM, 20% daily active, ~2 banner views per active user per day). Google pays out from US$100 earned, so at a few hundred users payouts are slow. A one-off "Remove ads" purchase is expected to earn more than the banner at this size.

## 2. Rules: what "not obnoxious" means (non-negotiable)

1. **One small banner, nothing else.** Adaptive anchored banner at the bottom of a few browsing screens. **Never** interstitials (full-screen), app-open ads, rewarded ads, native ads disguised as content, or video with sound.
2. **Never where people are doing something:** no ads on onboarding, sign-in, add/edit forms, lending/return flows, settings, or any sheet/modal. Never covering content or the tab bar; the screen's content is padded for it (safe-area and status-bar handling per the studio's insets learnings).
3. **A grace period:** no ads for a new user's first 7 days, so first impressions are the app, not an ad.
4. **Clean ad content:** in AdMob, max ad content rating **PG**; block sensitive categories (gambling, dating, alcohol, politics, get-rich-quick, religion); no ads for apps that compete.
5. **Respect "no":** if iPhone users decline tracking, or EU/UK users decline consent, show **non-personalised** ads only. No nagging to re-ask.
6. **Kill switch:** ads can be turned off for everyone from a Supabase config row without a new release (e.g. if a bad ad slips through or income isn't worth it).
7. **Remove ads, once, forever:** a one-off in-app purchase, also restores on a new phone. Anyone who bought it never sees an ad again.

## 3. "Remove ads" purchase

- Non-consumable, product id `lenderoo_remove_ads`, **A$3.99** (Apple's tier near US$2.49). Family Sharing on.
- Shown as a small "Remove ads" link under the banner and a row in Settings, plus "Restore purchases". No pop-ups asking people to buy.
- Optional: name it **"Support Lenderoo · Remove ads"** so it reads as supporting an indie app, not paying a ransom.
- **Needs the Paid Apps agreement (Apple) and a merchant account (Google)**, same as the studio apps. Ads can ship first, with the purchase following once those are set up; the banner's "Remove ads" link stays hidden until then.

## 4. Build steps

| # | Step | Who | Est. |
|---|---|---|---|
| A1 | AdMob account; add Lenderoo (iOS + Android), create two banner ad units per platform; set content rating and blocked categories (§2.4); tax and bank details | Alana | 1 h |
| A2 | `react-native-google-mobile-ads` (Expo config plugin) with test ad ids in dev; `<QuietBanner>` component (adaptive anchored, fixed height reserved so layout doesn't jump, hidden when loading fails) on the agreed screens only | Claude Code | ½–1 day |
| A3 | Consent: Google UMP for EU/UK; iOS App Tracking Transparency prompt **after** the grace period, with a plain one-line explanation; non-personalised fallback | Claude Code | ½ day |
| A4 | Rules engine: grace period (first-open date), purchased → no ads, Supabase `app_config.ads_enabled` kill switch, offline → no banner; unit tested | Claude Code | ½ day |
| A5 | Store and legal: App Store privacy label (Identifiers → Device ID and Usage Data for **Third-Party Advertising**; Tracking = yes only if ATT is used), Play data safety ("contains ads" + ad ID), privacy policy update on lenderoo.app, `app-ads.txt` on lenderoo.app | Claude Code drafts, Alana pastes | ½ day |
| A6 | Device QA on small and large iPhones and Androids (SE-sized, 3-button nav, Dynamic Type): banner never overlaps content or tab bar; test ads only on own devices (clicking real ads on your own app can get the AdMob account banned) | Both | ½ day |
| A7 | Release: new build both stores; AdMob app linked to the store listings once live | Alana | — |
| P1 | Later, once Paid Apps / merchant are active: `lenderoo_remove_ads` IAP, Settings rows, restore, sandbox test, review notes | Claude Code + Alana | 1 day |

**Total:** ~2–3 days of build for ads (A2–A6), ~1 day for the purchase (P1).

## 5. Placement (to confirm against Lenderoo's screens)

Home, Library, Explore, Friends, a friend's profile and Borrowed: a full-width bar at the bottom edge, with the tab bar resting on it. Not on Settings, the Add Friend form, item detail, forms, lending flows, onboarding or sign-in.

## 6. Watch after launch (monthly)

AdMob: earnings, eCPM, fill rate, match rate; any complaints in reviews about ads; Remove-ads purchases. If the banner earns under ~A$5/month after 3 months and reviews mention it, consider turning it off with the kill switch and relying on Remove ads / a tip jar.

## 7. Build brief

1. `react-native-google-mobile-ads` via its Expo config plugin (pin the version; this needs a new native build). App ids and ad unit ids from env/EAS secrets, **Google's test ids in development**.
2. A `<QuietBanner>` component: adaptive anchored banner, reserves its height so content never jumps, padded above the tab bar and safe areas on both platforms, renders nothing when ads are off, offline, loading failed, or the user is in the grace period or has purchased. Placed only on the agreed screens.
3. `shouldShowAds()` pure function + tests: grace period of 7 days from first open (stored locally and on the user's Supabase profile if signed in), purchase entitlement, `app_config.ads_enabled` kill switch (cached, default **off** if never fetched), consent state.
4. Consent: Google UMP form for EEA/UK before the first ad request; iOS ATT prompt only after the grace period, with `NSUserTrackingUsageDescription` = "Lets Lenderoo show ads that are more relevant to you. You'll still see the same number of ads either way."; personalised ads only if allowed, otherwise `requestNonPersonalizedAdsOnly`.
5. "Remove ads" scaffolding behind a flag (`features.removeAds`, off): Settings row, "Remove ads" link under the banner, restore. Product id `lenderoo_remove_ads`. Don't wire the store purchase until the Paid Apps agreement and merchant account are active; then use the repo's existing IAP library if there is one, otherwise ask before adding one.
6. Draft the store changes to paste: App Store privacy answers, Play data-safety answers, the privacy policy section for lenderoo.app, and the `app-ads.txt` line (from the AdMob publisher id).
7. QA checklist: iPhone SE-size and a large iPhone, Android with 3-button and gesture navigation, largest text size, dark mode; banner never overlaps content or the tab bar. Don't tap real ads on your own devices.
8. Update CLAUDE.md, the changelog and any learnings doc.

Show a plan first and wait for Alana's OK, including (1) which 2–3 screens get the banner, (2) any new dependencies, (3) the Supabase `app_config` change. Small PRs, commit after each step.
