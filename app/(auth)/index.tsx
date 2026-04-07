import { View, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { SplashView } from "@/components/SplashView";

export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#00BFA6" }}>
      <StatusBar barStyle="light-content" backgroundColor="#00BFA6" />

      <SplashView />

      <View className="px-8 pb-10 gap-3">
        <Button
          onPress={() => router.push("/(auth)/sign-up")}
          className="bg-white"
        >
          <Text className="font-sans-bold text-base text-primary">
            Get Started
          </Text>
        </Button>

        <Button
          variant="outline"
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
