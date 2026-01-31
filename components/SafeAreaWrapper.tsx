import { Pressable, View } from "react-native";
import { Moon, Sun } from "lucide-react-native";
import { useThemeContext } from "../contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function SafeAreaWrapper({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-background px-4"
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
      pointerEvents="box-none"
    >
      {children}
    </View>
  );
}
