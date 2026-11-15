# Lenderoo 1.1.0: store submission pack

Everything to paste or click for 1.1.0, in order. Prepared 13 Nov 2026 from `CHANGELOG.md`,
`docs/ADS-STORE-DRAFTS.md` and the code on `chore/release-1.1.0`. The last store builds were 1.0.0
(iOS 16, Android 24, July 2026).

## 0. Before building

- [x] **Android submission key in EAS** (13 Nov 2026): `lenderoo@zepira.iam.gserviceaccount.com`, key `601dbcce…`, assigned to Play Store submissions in `eas credentials`; `serviceAccountKeyPath` removed from `eas.json`. The builds keep the original keystore (the Default build credentials, SHA-1 `8D:42:B6:6E…`); the second keystore set made that day is unused.
- [x] **Merge the release PR** (#14) into `master` (13 Nov 2026).
- [x] **Launching with ads** (decided 13 Nov 2026): the EAS production env has the real AdMob app
      ids and banner unit ids, so 1.1.0 can show ads as soon as the Supabase switch is on, with no
      new build. The store answers below cover ads. The switch (`app_config` → `ads`) stays
      `{"enabled": false}` until the device QA in `ADS-STORE-DRAFTS.md` §6 passes on the tester
      builds and the store declarations are in; then flip it (a live change, with Alana's OK).
- [x] **Privacy policy and app-ads.txt are live:** lenderoo.app/privacy has the Ads section
      (lenderoo.com #2) and https://lenderoo.app/app-ads.txt has the AdMob publisher line.

## 1. Build and test (2 cloud builds: 1 iOS, 1 Android)

```
npx eas-cli build --platform all --profile production --non-interactive --auto-submit
```

Started 13 Nov 2026: iOS build 20 → TestFlight, Android version code 27 → closed testing (Alpha),
as a draft.

`runtimeVersion` is now the fingerprint policy and the builds carry the `production` channel, so
they won't pick up any update published for 1.0.

Release the Alpha draft to the closed testers in Play Console when you're ready (it's a draft so you choose). On the TestFlight and closed-testing builds, with two accounts:

- [ ] Request an item that's lent out: the owner's dialog says "Approve as next in queue"; approve.
- [ ] The borrower sees "Borrowing Next"; the owner removes them with the × and they get
      "Request Declined".
- [ ] "Their history with you" on an incoming request shows past loans, late ones flagged.
- [ ] Add Friend → Invite a friend opens the share sheet with the code and lenderoo.app.
- [ ] The barcode scanner shows its frame and still scans a book.
- [ ] With the switch off: no ad bar anywhere, and no tracking prompt on iPhone.
- [ ] Then `ADS-STORE-DRAFTS.md` §6 (switch on in a test window, Google's test ads on our own
      phones only: never tap a real ad).
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
> - A small banner ad on some browsing screens helps keep Lenderoo free. Never on forms, settings
>   or while you're lending, and not in your first week.

**App Review Information → Notes** (paste; the sign-in details stay as they are for 1.0, check the
demo account still signs in and has a friend and an item to borrow):

> This version adds a single small banner ad from Google AdMob on a few browsing screens (Home,
> Library, Explore, Friends and Borrowed). There are no interstitial, video or full-screen ads, and
> no ads on settings, forms, sign-in or any lending flow. New accounts see no ads for their first 7
> days. Before the first ad request, users in the EU and UK see Google's consent form and iPhone
> users see the App Tracking Transparency prompt (once); declining still shows non-personalised ads.
> Ads are switched on and off server-side, so during review the banner may not appear yet.

**App Privacy:** add the ad data types and tracking from `docs/ADS-STORE-DRAFTS.md` §1 before
submitting ("Does this app track?" → Yes; Device ID, Advertising Data, Product Interaction and
Coarse Location used for third-party advertising; Performance and Crash Data). 1.1.0 can start ads
without an update, so the label has to cover them now.

**Marketing URL:** https://lenderoo.app (AdMob finds `app-ads.txt` through it).

**Version release:** manual, so you choose the day.

## 3. Google Play Console

- **App content → Advertising ID:** **Yes**, for Advertising or marketing, Analytics, and Fraud
  prevention (`ADS-STORE-DRAFTS.md` §2). The ads library adds the `AD_ID` permission to every
  build, and Play rejects a release whose manifest has it while this form says No.
- **App content → Ads:** **Yes**, the app contains ads.
- **App content → Data safety:** add the four rows in `ADS-STORE-DRAFTS.md` §2 (advertising ID,
  approximate location, app interactions, crash logs and diagnostics; collected and shared with
  Google).
- **Store listing → Website:** https://lenderoo.app (for `app-ads.txt`).
- **Release notes** (en-AU, 500 characters max; paste):

> See a friend's history with your things before approving, approve as next in the queue, and take
> people out of the queue. Invite friends with your friend code. A frame in the barcode scanner.
> Faster, with a readable status bar, clearer toasts, tidier cards and the right light and dark
> mode. Send Feedback is now in Settings → Support. A small banner ad on some screens helps keep
> Lenderoo free (not on forms or settings, and not in your first week).

- **Production access first:** Zepira Labs is a personal Play account, so production opens only after 12 testers have been opted in to closed testing for 14 days (9 opted in on 13 Nov 2026). Then apply for production access, and promote the Alpha release (staged rollout if offered).

## 4. After release

- [ ] `CHANGELOG.md`: "1.1.0 (unreleased)" → "1.1.0 (dd Mon 2026)".
- [ ] Flip the ads switch on (Supabase `app_config` → `ads` → `{"enabled": true}`) once QA has
      passed and both stores have approved 1.1.0. Watch AdMob for the first impressions.
- [ ] AdMob: link the app to its store listings once 1.1.0 is live, and check `app-ads.txt` shows
      as verified.
