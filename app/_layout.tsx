import "../global.css";

import * as React from "react";
import { View, LogBox } from "react-native";
import {
  configureNotifications,
  registerPushToken,
  addNotificationTapListener,
} from "@/lib/notifications";

// Suppress the SafeAreaView deprecation warning produced by expo-router's
// internal components (DefaultNavigator, ErrorBoundary).  Our own code
// already imports SafeAreaView from react-native-safe-area-context.
LogBox.ignoreLogs(["SafeAreaView has been deprecated"]);
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
import { customStorage } from "../lib/async-storage-wrapper";

export { ErrorBoundary } from "expo-router";

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
  const splashHidden = React.useRef(false);

  const stackScreenOptions = React.useMemo(
    () => ({
      contentStyle: { backgroundColor: isDark ? "#0a0a0a" : "#ffffff" },
    }),
    [isDark],
  );

  // Configure foreground notification display once (no-op in Expo Go)
  React.useEffect(() => {
    configureNotifications();
  }, []);

  // Register push token when user logs in (no-op in Expo Go)
  React.useEffect(() => {
    if (!user) return;
    registerPushToken(user.id).catch(() => {});
  }, [user?.id]);

  // Handle notification taps (app opened from background/killed via notification)
  React.useEffect(() => addNotificationTapListener(), []);

  // Hide the native splash once auth and theme are ready, then navigate.
  React.useEffect(() => {
    if (themeLoading || authLoading) return;

    // Guard: hideAsync must only be called once — subsequent calls on iOS
    // throw "no native splash screen registered for given view controller"
    // because each modal/new view controller gets a fresh native context.
    if (!splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }

    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      customStorage.getItem("@lenderoo_has_signed_in").then((value) => {
        if (value) {
          router.replace("/(auth)/sign-in");
        } else {
          router.replace("/(auth)/");
        }
      });
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
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        <Stack.Screen name="item" options={{ headerShown: false }} />
        <Stack.Screen name="edit-item" options={{ headerShown: false }} />
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
