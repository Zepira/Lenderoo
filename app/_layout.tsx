import "../global.css";

import * as React from "react";
import { View } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { StatusBar } from "expo-status-bar";
import { SplashScreen, Stack } from "expo-router";
import { Provider } from "components/Provider";
import { useThemeContext } from "../contexts/ThemeContext";

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
  const { activeTheme, isLoading } = useThemeContext();
  const isDark = activeTheme === "dark";

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

  // Hide splash screen once theme is loaded
  React.useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Don't render anything until theme is loaded
  if (isLoading) {
    return null;
  }

  return (
    <View className={isDark ? "dark flex-1" : "flex-1"}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack screenOptions={stackScreenOptions}>
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
      </ThemeProvider>
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
