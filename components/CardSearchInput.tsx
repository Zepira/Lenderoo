import { View, TextInput } from "react-native";
import { Search } from "lucide-react-native";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";

interface CardSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function CardSearchInput({
  value,
  onChangeText,
  placeholder = "Search…",
}: CardSearchInputProps) {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 24,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: isDark ? theme.muted : "#F3F4F6",
          borderRadius: 16,
          paddingHorizontal: 14,
          gap: 10,
        }}
      >
        <Search size={18} color={theme.mutedForeground} />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={theme.mutedForeground}
          value={value}
          onChangeText={onChangeText}
          style={{
            flex: 1,
            paddingVertical: 14,
            fontSize: 15,
            color: theme.foreground,
          }}
        />
      </View>
    </View>
  );
}
