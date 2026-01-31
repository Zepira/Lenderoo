import "../global.css";

import * as React from "react";
import { View, ActivityIndicator } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { StatusBar } from "expo-status-bar";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { Provider } from "components/Provider";
import { useThemeContext } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { activeTheme, isLoading: themeLoading } = useThemeContext();
  const { user, loading: authLoading } = useAuth();
  const isDark = activeTheme === "dark";
  const router = useRouter();
  const segments = useSegments();

  // Memoize the navigation theme to prevent context disruption
  const navigationTheme = React.useMemo(
    () => (isDark ? DarkTheme : DefaultTheme),
    [isDark]
  );

  // Memoize screen options to prevent unnecessary re-renders
  const stackScreenOptions = React.useMemo(
    () => ({
      contentStyle: { backgroundColor: isDark ? "#0a0a0a" : "#ffffff" },
    }),
    [isDark]
  );

  // Auth-based navigation
  React.useEffect(() => {
    if (themeLoading || authLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // User is not authenticated and not in auth group, redirect to sign-in
      console.log('🔒 No user detected, redirecting to sign-in');
      router.replace('/(auth)/sign-in');
    } else if (user && inAuthGroup) {
      // User is authenticated but still in auth group, redirect to tabs
      console.log('✅ User authenticated, redirecting to main app');
      router.replace('/(tabs)');
    }
  }, [user, segments, themeLoading, authLoading, router]);

  // Hide splash screen once both theme and auth are loaded
  React.useEffect(() => {
    if (!themeLoading && !authLoading) {
      SplashScreen.hideAsync().catch((error) => {
        // Splash screen may already be hidden or not registered
        console.log("Splash screen hide error (safe to ignore):", error.message);
      });
    }
  }, [themeLoading, authLoading]);

  // Show loading indicator while theme or auth is loading
  if (themeLoading || authLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className={isDark ? "dark flex-1" : "flex-1"}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="add-item"
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom",
            gestureEnabled: true,
            gestureDirection: "vertical",
          }}
        />

        <Stack.Screen
          name="modal"
          options={{
            title: "Lenderoo",
            presentation: "modal",
            animation: "slide_from_right",
            gestureEnabled: true,
            gestureDirection: "horizontal",
          }}
        />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Provider>
        <RootLayoutContent />
      </Provider>
    </SafeAreaProvider>
  );
}
