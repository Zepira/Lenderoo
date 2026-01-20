// Learn more https://docs.expo.io/guides/customizing-metro
/**
 * @type {import('expo/metro-config').MetroConfig}
 */
const { getDefaultConfig } = require("expo/metro-config");
const { withTamagui } = require("@tamagui/metro-plugin");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

config.resolver.sourceExts.push("mjs");

// Configure public path for GitHub Pages deployment
if (process.env.EXPO_PUBLIC_URL) {
  config.transformer = {
    ...config.transformer,
    publicPath: process.env.EXPO_PUBLIC_URL,
  };
}

// Apply both Tamagui and NativeWind transformations
// First apply Tamagui, then wrap with NativeWind
module.exports = withNativeWind(
  withTamagui(config, {
    components: ["tamagui"],
    config: "./tamagui.config.ts",
    outputCSS: "./tamagui-web.css",
  }),
  {
    input: "./global.css",
    inlineRem: 16,
  }
);
