import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";

// Lenderoo design tokens as hex for React Native inline styles.
// The matching CSS custom properties are defined in global.css.
//
// Teal roles (WCAG AA):
// - primary (#00BFA6, brand): icons, highlights, tints, borders. Never put
//   white text on it (2.3:1) and never use it for text on a light background.
// - primaryStrong (#0F766E, teal-700): filled buttons and any fill behind
//   white text (5.5:1). primaryStrongPressed (#115E59, teal-800) when pressed.
// - primaryInk: teal text. teal-700 on light (5.4:1), brand teal on dark (8.2:1).
export const THEME = {
  light: {
    primary: "#00BFA6",
    primaryForeground: "#FFFFFF",
    primaryStrong: "#0F766E",
    primaryStrongPressed: "#115E59",
    primaryInk: "#0F766E",
    secondary: "#FFC857",
    secondaryForeground: "#111827",
    destructive: "#FF6B6B",
    destructiveForeground: "#FFFFFF",
    background: "#FDFDFD",
    foreground: "#111827",
    card: "#FDFDFD",
    cardForeground: "#111827",
    muted: "#F5F5F5",
    mutedForeground: "#9CA3AF",
    accent: "#F5F5F5",
    accentForeground: "#111827",
    border: "#E5E7EB",
    input: "#F5F5F5",
    ring: "#00BFA6",
  },
  dark: {
    primary: "#00BFA6",
    primaryForeground: "#FFFFFF",
    primaryStrong: "#0F766E",
    primaryStrongPressed: "#115E59",
    primaryInk: "#00BFA6",
    secondary: "#FFC857",
    secondaryForeground: "#111827",
    destructive: "#FF6B6B",
    destructiveForeground: "#FFFFFF",
    background: "#0A0F1E",
    foreground: "#F0F4F8",
    card: "#111827",
    cardForeground: "#F0F4F8",
    muted: "#1E293B",
    mutedForeground: "#94A3B8",
    accent: "#1E293B",
    accentForeground: "#F0F4F8",
    border: "#334155",
    input: "#1E293B",
    ring: "#00BFA6",
  },
};

export const NAV_THEME: Record<"light" | "dark", Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
