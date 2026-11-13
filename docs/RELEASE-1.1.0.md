# Lenderoo 1.1.0: store submission pack

Everything to paste or click for 1.1.0, in order. Prepared 13 Nov 2026 from `CHANGELOG.md`,
`docs/ADS-STORE-DRAFTS.md` and the code on `chore/release-1.1.0`. The last store builds were 1.0.0
(iOS 16, Android 24, July 2026).

## 0. Before building

- [ ] **Android submission key into EAS** (Alana): `npx eas-cli credentials -p android` in this repo
      → production → Google Service Account → upload the Play service-account JSON. The file
      `eas.json` points at (`android/zepira-390c2fd69214.json`) isn't on the Mac any more, so
      `eas submit` for Android fails until this is done. Then remove `serviceAccountKeyPath` from
      `eas.json` (Claude Code can).
- [ ] **Merge the release PR** (#14) into `master`, so the builds come from `master`.
- [ ] **Ads stay off:** no `EXPO_PUBLIC_ADMOB_BANNER_*` or `ADMOB_*_APP_ID` in the EAS production
      env, and `app_config` → `ads` → `{"enabled": false}` in Supabase. 1.1.0 ships the ads code
      dormant (`docs/ADS-STORE-DRAFTS.md` §5).

## 1. Build and test (2 cloud builds: 1 iOS, 1 Android)

```
npx eas-cli build --platform all --profile production --non-interactive
npx eas-cli submit --platform ios --latest      # to TestFlight
npx eas-cli submit --platform android --latest  # to Play internal testing (after step 0)
```

`runtimeVersion` is now the fingerprint policy and the builds carry the `production` channel, so
they won't pick up any update published for 1.0.

On the TestFlight and internal-testing builds, with two accounts:

- [ ] Request an item that's lent out: the owner's dialog says "Approve as next in queue"; approve.
- [ ] The borrower sees "Borrowing Next"; the owner removes them with the × and they get
      "Request Declined".
- [ ] "Their history with you" on an incoming request shows past loans, late ones flagged.
- [ ] Add Friend → Invite a friend opens the share sheet with the code and lenderoo.app.
- [ ] The barcode scanner shows its frame and still scans a book.
- [ ] No ad bar anywhere, and no tracking prompt on iPhone.
- [ ] The rest of `CHANGELOG.md` 1.1.0 at a glance: status bar on item photos and sign-in, toasts,
      card sizes, Send Feedback in Settings → Support, dark/light mode.

## 2. App Store Connect (version 1.1.0)

**What's New** (paste):

> - See someone's history with your things before you approve their request.
> - Approving a request for something that's lent out puts them next in the queue, and you can take
>   someone out of the queue.
> - Invite friends: share your friend code and a link to Lenderoo from Add Friend.
> - The barcode scanner shows a frame to line the barcode up in.
> - Faster and lighter: Lenderoo no longer checks your favourites in the background.
> - A readable status bar over item photos, clearer toasts, tidier cards and request cards, and
>   light and dark mode that no longer get mixed up.
> - Send Feedback has moved to Settings → Support.

**App Review Information → Notes** (paste; the sign-in details stay as they are for 1.0, check the
demo account still signs in and has a friend and an item to borrow):

> This version includes Google AdMob for a small banner ad we plan to turn on in a later update. Ads
> are currently switched off server-side, so no ads are shown and the App Tracking Transparency
> prompt does not appear in this build. When ads are turned on, the prompt is shown once, before any
> ad request, and only to users who have used the app for at least 7 days.

**App Privacy:** no change for 1.1.0 (the ad SDK never starts, so it collects nothing). The ad
data types in `docs/ADS-STORE-DRAFTS.md` §1 go in with the build that turns ads on.

**Version release:** manual, so you choose the day.

## 3. Google Play Console

- **App content → Advertising ID:** **Yes**, for Advertising or marketing, Analytics, and Fraud
  prevention (`ADS-STORE-DRAFTS.md` §2). The ads library adds the `AD_ID` permission to every
  build, and Play rejects a release whose manifest has it while this form says No.
- **App content → Ads:** **No** for 1.1.0 (nothing is shown). Change it to Yes, and add the data
  safety rows in `ADS-STORE-DRAFTS.md` §2, with the build that turns ads on.
- **Release notes** (en-AU, 500 characters max; paste):

> See a friend's history with your things before approving, approve as next in the queue, and take
> people out of the queue. Invite friends with your friend code. A frame in the barcode scanner.
> Faster, with a readable status bar, clearer toasts, tidier cards and the right light and dark
> mode. Send Feedback is now in Settings → Support.

- Promote the internal-testing release to production (staged rollout if offered).

## 4. After release

- [ ] `CHANGELOG.md`: "1.1.0 (unreleased)" → "1.1.0 (dd Mon 2026)".
- [ ] lenderoo.app: nothing to change for 1.1.0 (no account-deletion or privacy behaviour changed).
