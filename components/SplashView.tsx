import { View } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/ui/text";

/**
 * Shared splash screen visuals — used both as the app loading state
 * and as the background for the auth welcome screen.
 * Callers are responsible for the outer container (SafeAreaView, bg colour, etc).
 */
export function SplashView() {
  return (
    <View className="flex-1 items-center justify-center ">
      <Image
        source={require("../assets/images/kangaroo.png")}
        style={{ width: 450, height: 450, marginBottom: -50 }}
        contentFit="contain"
        cachePolicy="memory-disk"
      />

      <Text
        className="text-center text-white"
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 40,
          lineHeight: 48,
          marginBottom: 8,
        }}
      >
        Lenderoo
      </Text>

      <Text
        className="text-center"
        style={{
          fontFamily: "Inter-Medium",
          fontSize: 16,
          lineHeight: 24,
          color: "#CCF2ED",
        }}
      >
        Why buy when you can borrow?
      </Text>
    </View>
  );
}
