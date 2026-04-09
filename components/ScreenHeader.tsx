import { View, Pressable } from "react-native";
import type { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { PageTitle } from "@/components/ui/typography";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  /** Optional element placed on the right side of the header row. */
  right?: ReactNode;
}

export function ScreenHeader({ title, showBack, onBack, right }: ScreenHeaderProps) {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
        marginBottom: 24,
      }}
    >
      <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            {showBack && (
              <Pressable
                onPress={onBack}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: isDark ? theme.muted : "#F3F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <ArrowLeft size={22} color={theme.mutedForeground} />
              </Pressable>
            )}
            <PageTitle style={{ flex: 1 }}>{title}</PageTitle>
            {right}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
