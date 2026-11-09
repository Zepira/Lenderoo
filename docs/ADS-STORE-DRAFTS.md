# Ads — store and legal drafts (to paste)

_Drafts for docs/ADS-PLAN.md step A5. Before submitting, check the answers
against Google's current "Data disclosure" page for the Google Mobile Ads SDK
(AdMob help centre) and the App Store / Play forms, which change from time to
time. Replace `pub-XXXXXXXXXXXXXXXX` with the AdMob publisher id._

The data below is collected **by the Google Mobile Ads SDK**, not by Lenderoo
itself. Lenderoo still has to declare it.

---

## 1. App Store Connect → App Privacy

Add these data types (on top of what's already declared for the app):

| Data type | Used for | Linked to the user? | Used for tracking? |
|---|---|---|---|
| **Identifiers → Device ID** | Third-Party Advertising | No | **Yes**, because the app asks for tracking permission (ATT) and uses the advertising identifier when allowed |
| **Usage Data → Advertising Data** | Third-Party Advertising, Analytics | No | Yes |
| **Location → Coarse Location** (approximate, from IP) | Third-Party Advertising | No | No |
| **Diagnostics → Crash Data, Performance Data, Other Diagnostic Data** | Analytics (SDK health) | No | No |

"Does this app track?" → **Yes** (only the SDK's advertising identifier, and
only when the person allows it in Apple's prompt).

## 2. Google Play Console

**App content → Ads:** Yes, the app contains ads.

**App content → Advertising ID:** Yes, the app uses an advertising ID, for
**Advertising or marketing** and **Analytics**. (The ads library adds the
`AD_ID` permission automatically.)

**App content → Data safety** (add to the existing answers):

| Data type | Collected | Shared | Purpose | Optional? |
|---|---|---|---|---|
| Device or other IDs (advertising ID) | Yes | Yes (Google) | Advertising or marketing, Analytics, Fraud prevention | No |
| Approximate location (from IP) | Yes | Yes (Google) | Advertising or marketing, Analytics, Fraud prevention | No |
| App activity → App interactions | Yes | Yes (Google) | Advertising or marketing, Analytics | No |
| App info and performance → Crash logs, Diagnostics | Yes | Yes (Google) | Analytics | No |

Data is encrypted in transit: Yes. Users can request deletion: Yes (existing
answer; ad data is held by Google under its own policy).

## 3. Privacy policy section (lenderoo.app/privacy)

> ### Ads
>
> Lenderoo shows a small banner ad on some screens to help cover the cost of
> running the app. Ads are provided by Google AdMob. New users see no ads for
> their first 7 days, and you can remove ads for good with a one-off purchase.
>
> To show ads, Google's ad software may collect your device's advertising
> identifier, your approximate location (based on your IP address),
> information about how ads are shown and tapped, and diagnostic information.
> This is collected and used by Google under
> [Google's privacy policy](https://policies.google.com/privacy) and
> [how Google uses information from apps that use its services](https://policies.google.com/technologies/partner-sites).
> Lenderoo doesn't send Google your name, email, friends or items.
>
> **Your choices.** On iPhone, Lenderoo asks whether apps may track you; if you
> say no, you'll only see ads that aren't personalised. In the EU and UK you'll
> be asked for consent before any ad is shown, and you can say no. Either way
> you'll see the same number of ads. You can also reset or limit your
> advertising identifier in your phone's settings.

## 4. app-ads.txt

Host a plain-text file at **https://lenderoo.app/app-ads.txt** containing:

```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

The website must also be the **Marketing URL / Website** in both store
listings, so AdMob can find the file. AdMob verifies it within about a day.

## 5. Device QA checklist (before turning ads on)

Use Google's **test ads only** on our own devices. Never tap a real ad in
Lenderoo on your own phone: AdMob can suspend the account for it.

- [ ] iPhone SE-sized simulator, a large iPhone, an Android phone with
      3-button navigation and one with gesture navigation.
- [ ] The bar sits flush at the bottom edge on Home, Library, Explore, Friends,
      a friend's profile and Borrowed, with the tab bar resting on it.
- [ ] No bar on Settings, the Add Friend form, item screens, add/edit forms,
      sign-in, onboarding or any sheet; the tab bar sits in its usual place.
- [ ] The last item on each ad screen scrolls clear of the bar.
- [ ] Largest text size (Dynamic Type / Android font size) and dark mode.
- [ ] Airplane mode: no bar, the tab bar stays down, nothing jumps.
- [ ] Kill switch off in Supabase (`app_config` → `ads` → `{"enabled": false}`):
      no bar after the app comes back to the foreground.
- [ ] New account (under 7 days old): no bar and no tracking prompt.
- [ ] iPhone: tracking prompt appears once, after the grace period; "Ask App
      Not to Track" still shows (non-personalised) ads and never asks again.
- [ ] EU/UK (use AdMob's debug geography or a VPN): consent form before the
      first ad; declining still shows non-personalised ads.
