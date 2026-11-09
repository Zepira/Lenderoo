/**
 * useTheme Hook
 *
 * Manages theme (light/dark/system) with persistence
 */

import { useState, useEffect, useCallback } from "react";
import { colorScheme, useColorScheme } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_STORAGE_KEY = "@lenderoo:theme";

export type ThemeMode = "light" | "dark" | "system";

export function useTheme() {
  // NativeWind's colour scheme is the single source of truth: className
  // styles read it, and activeTheme below reads it back for inline styles.
  // Computing activeTheme separately (from RN's useColorScheme) let the two
  // drift apart, leaving dark-mode text on light-mode backgrounds.
  const { colorScheme: nativeWindScheme } = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (
          stored &&
          (stored === "light" || stored === "dark" || stored === "system")
        ) {
          setThemeModeState(stored as ThemeMode);
        }
      } catch (error) {
        console.error("Failed to load theme preference:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Hand the preference to NativeWind ("system" follows the device).
  useEffect(() => {
    if (!isLoading) colorScheme.set(themeMode);
  }, [themeMode, isLoading]);

  // Set theme preference
  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  }, []);

  // Cycle through themes
  const cycleTheme = useCallback(() => {
    const modes: ThemeMode[] = ["light", "dark", "system"];
    const currentIndex = modes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setThemeMode(modes[nextIndex]);
  }, [themeMode, setThemeMode]);

  const activeTheme: "light" | "dark" =
    nativeWindScheme === "dark" ? "dark" : "light";

  return {
    themeMode,
    activeTheme,
    setThemeMode,
    cycleTheme,
    isLoading,
  };
}
