import { useCallback } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { SplashView } from "@/components/SplashView";
import { THEME } from "@/lib/theme";
import { useThemeContext } from "@/contexts/ThemeContext";

export default function WelcomeScreen() {
  const { activeTheme } = useThemeContext();

  // Light status bar on the teal only while this screen is in front; a
  // mounted <StatusBar> here kept it light on the white sign-in screen.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle(activeTheme === "dark" ? "light" : "dark");
    }, [activeTheme])
  );

  return (
    // primaryStrong: the fill behind white text (brand teal for now, see lib/theme.ts).
    <SafeAreaView className="flex-1" style={{ backgroundColor: THEME.light.primaryStrong }}>
      <SplashView />

      <View className="px-8 pb-10 gap-3">
        <Button
          variant="outline-white"
          onPress={() => router.push("/(auth)/sign-in")}
        >
          <Text className="font-sans-medium text-base text-white">
            Get started
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
