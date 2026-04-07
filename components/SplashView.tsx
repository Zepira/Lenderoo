import { View, Image } from "react-native";
import { Text } from "@/components/ui/text";

/**
 * Shared splash screen visuals — used both as the app loading state
 * and as the background for the auth welcome screen.
 * Callers are responsible for the outer container (SafeAreaView, bg colour, etc).
 *
 * Font families and image dimensions are applied via inline styles to avoid
 * relying on NativeWind's custom class transformation, which is unreliable
 * for custom fontFamily values on native.
 */
export function SplashView() {
  return (
    <View className="flex-1 items-center justify-center ">
      <Image
        source={require("../assets/images/kangaroo.png")}
        style={{ width: 450, height: 450, marginBottom: -50 }}
        resizeMode="contain"
      />

      {/* Outfit Bold 40px */}
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

      {/* Inter Medium 16px, light teal */}
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
