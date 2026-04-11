import { type ReactNode } from "react";
import { Platform } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ThemeProvider } from "../contexts/ThemeContext";
import { AuthProvider } from "../contexts/AuthContext";
import { queryClient } from "../lib/query-client";

interface ProviderProps {
  children: ReactNode;
}

export function Provider({ children }: ProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
      {Platform.OS === "web" && (
        <Toaster position="top-center" richColors closeButton />
      )}
    </QueryClientProvider>
  );
}
