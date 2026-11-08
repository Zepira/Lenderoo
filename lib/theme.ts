import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";

// Lenderoo design tokens as hex for React Native inline styles.
// The matching CSS custom properties are defined in global.css.
//
// Colour roles. They all use the brand colours for now; the darker WCAG AA
// values (teal-700 fills/text, amber-700 text) were rolled back because they
// changed the brand look. Accessibility will be improved another way.
// - primary: icons, highlights, tints, borders.
// - primaryStrong / primaryStrongPressed: filled buttons and fills behind
//   white text (white on brand teal is 2.3:1).
// - primaryInk: teal text (brand teal on white is 2.3:1).
// - secondaryInk: yellow-family text (brand yellow on white is 1.5:1).
export const THEME = {
  light: {
    primary: "#00BFA6",
    primaryForeground: "#FFFFFF",
    primaryStrong: "#00BFA6",
    primaryStrongPressed: "#00BFA6",
    primaryInk: "#00BFA6",
    secondary: "#FFC857",
    secondaryForeground: "#111827",
    secondaryInk: "#FFC857",
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
    primaryStrong: "#00BFA6",
    primaryStrongPressed: "#00BFA6",
    primaryInk: "#00BFA6",
    secondary: "#FFC857",
    secondaryForeground: "#111827",
    secondaryInk: "#FFC857",
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
