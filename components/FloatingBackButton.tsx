import { Pressable, TouchableOpacity, View } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface FloatingBackButtonProps {
  onPress?: () => void;
}

export function FloatingBackButton({ onPress }: FloatingBackButtonProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Check if we can go back in navigation history
      if (navigation.canGoBack()) {
        router.back();
      } else {
        // Fallback to home if no history
        router.push("/(tabs)" as any);
      }
    }
  };

  return (
    <View
      style={{
        position: "absolute",
        top: insets.top + 12,
        left: 16,
        zIndex: 50,
      }}
    >
      <TouchableOpacity
        onPress={handlePress}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: isDark
            ? THEME.dark.background
            : THEME.light.background,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
          borderWidth: 1,
          borderColor: isDark ? THEME.dark.border : THEME.light.border,
          opacity: 1,
        }}
        activeOpacity={0.8}
      >
        <ChevronLeft
          size={24}
          color={isDark ? THEME.dark.foreground : THEME.light.foreground}
        />
      </TouchableOpacity>
    </View>
  );
}
