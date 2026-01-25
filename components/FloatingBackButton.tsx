import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface FloatingBackButtonProps {
  onPress?: () => void;
}

export function FloatingBackButton({ onPress }: FloatingBackButtonProps) {
  const router = useRouter();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
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
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: isDark
            ? THEME.dark.background
            : THEME.light.background,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.8 : 1,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
          borderWidth: 1,
          borderColor: isDark ? THEME.dark.border : THEME.light.border,
        })}
      >
        <ChevronLeft
          size={24}
          color={isDark ? THEME.dark.foreground : THEME.light.foreground}
        />
      </Pressable>
    </View>
  );
}
