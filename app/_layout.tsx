import "../global.css";

import * as React from "react";
import { View, LogBox } from "react-native";

// Suppress the SafeAreaView deprecation warning produced by expo-router's
// internal components (DefaultNavigator, ErrorBoundary).  Our own code
// already imports SafeAreaView from react-native-safe-area-context.
LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
]);
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";

import { StatusBar } from "expo-status-bar";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { Provider } from "components/Provider";
import { useThemeContext } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";

export {
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { activeTheme, isLoading: themeLoading } = useThemeContext();
  const { user, loading: authLoading } = useAuth();
  const isDark = activeTheme === "dark";
  const router = useRouter();
  const segments = useSegments();

  const stackScreenOptions = React.useMemo(
    () => ({
      contentStyle: { backgroundColor: isDark ? "#0a0a0a" : "#ffffff" },
    }),
    [isDark]
  );

  // Hide the native splash once auth and theme are ready, then navigate.
  React.useEffect(() => {
    if (themeLoading || authLoading) return;

    SplashScreen.hideAsync().catch(() => {});

    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, segments, themeLoading, authLoading, router]);

  // Native splash is still visible while loading — nothing to render.
  if (themeLoading || authLoading) {
    return null;
  }

  return (
    <View className={isDark ? "dark flex-1" : "flex-1"}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
        <Stack.Screen name="item" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
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
  const [fontsLoaded] = useFonts({
    Outfit: Outfit_400Regular,
    "Outfit-Bold": Outfit_700Bold,
    "Outfit-ExtraBold": Outfit_800ExtraBold,
    Inter: Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-Bold": Inter_700Bold,
    "Inter-ExtraBold": Inter_800ExtraBold,
  });

  // Native splash stays visible until fonts are loaded.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Provider>
        <RootLayoutContent />
      </Provider>
    </SafeAreaProvider>
  );
}
