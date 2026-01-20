import { type ReactNode } from "react";
import { ThemeProvider } from "../contexts/ThemeContext";

interface ProviderProps {
  children: ReactNode;
}

export function Provider({ children }: ProviderProps) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
