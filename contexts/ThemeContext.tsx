/**
 * ThemeContext
 *
 * Provides theme state to the entire app
 */

import React, { createContext, useContext, type ReactNode } from "react";
import { useTheme, type ThemeMode } from "../hooks/useTheme";

interface ThemeContextType {
  themeMode: ThemeMode;
  activeTheme: "light" | "dark";
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  cycleTheme: () => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}
