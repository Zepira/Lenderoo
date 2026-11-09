import type { ConfigContext, ExpoConfig } from "expo/config";

// Extends app.json with the AdMob plugin (docs/ADS-PLAN.md). The AdMob app ids
// come from EAS env vars; without them, Google's public test app ids are used,
// which only ever serve test ads.
const GOOGLE_TEST_APP_IDS = {
  android: "ca-app-pub-3940256099942544~3347511713",
  ios: "ca-app-pub-3940256099942544~1458002511",
};

const TRACKING_DESCRIPTION =
  "Lets Lenderoo show ads that are more relevant to you. You'll still see the same number of ads either way.";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []).filter(
      (p) => (Array.isArray(p) ? p[0] : p) !== "expo-tracking-transparency",
    ),
    ["expo-tracking-transparency", { userTrackingPermission: TRACKING_DESCRIPTION }],
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: process.env.ADMOB_ANDROID_APP_ID ?? GOOGLE_TEST_APP_IDS.android,
        iosAppId: process.env.ADMOB_IOS_APP_ID ?? GOOGLE_TEST_APP_IDS.ios,
        // Don't start Google's measurement before consent is handled.
        delayAppMeasurementInit: true,
        userTrackingUsageDescription: TRACKING_DESCRIPTION,
      },
    ],
  ],
});
