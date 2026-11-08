import { View, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { SplashView } from "@/components/SplashView";
import { THEME } from "@/lib/theme";

export default function WelcomeScreen() {
  return (
    // primaryStrong: the fill behind white text (brand teal for now, see lib/theme.ts).
    <SafeAreaView className="flex-1" style={{ backgroundColor: THEME.light.primaryStrong }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.light.primaryStrong} />

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
