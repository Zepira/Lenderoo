import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { SplashView } from "@/components/SplashView";
import { THEME } from "@/lib/theme";

export default function WelcomeScreen() {
  // Light status bar on the teal only while this screen is in front. The
  // most recently mounted <StatusBar> wins, so this one overrides the root
  // layout's and hands back to it when unmounted (sign-in pushed on top).
  const isFocused = useIsFocused();

  return (
    // primaryStrong: the fill behind white text (brand teal for now, see lib/theme.ts).
    <SafeAreaView className="flex-1" style={{ backgroundColor: THEME.light.primaryStrong }}>
      {isFocused && <StatusBar style="light" />}
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
