import { View, Pressable } from "react-native";
import type { ComponentType, ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, X } from "lucide-react-native";
import { PageTitle, Caption } from "@/components/ui/typography";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";

interface ScreenHeaderProps {
  title: string;
  /** Optional subtitle shown below the title */
  subtitle?: string;
  /** Pass onBack to show the back arrow button */
  onBack?: () => void;
  /** Pass onDismiss to show an X button on the right (for modals) */
  onDismiss?: () => void;
  /** Coloured icon badge shown between back button and title */
  icon?: { Icon: ComponentType<{ size?: number; color?: string }>; color: string };
  /** Arbitrary element on the right — takes precedence over onDismiss */
  right?: ReactNode;
}

export function ScreenHeader({ title, subtitle, onBack, onDismiss, icon, right }: ScreenHeaderProps) {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  const btnStyle = ({ pressed }: { pressed: boolean }) => ({
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: isDark ? theme.muted : "#F3F4F6",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    opacity: pressed ? 0.6 : 1,
  });

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
        <View style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            {onBack && (
              <Pressable onPress={onBack} style={btnStyle}>
                <ArrowLeft size={22} color={theme.mutedForeground} />
              </Pressable>
            )}
            {icon && (
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: icon.color + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <icon.Icon size={18} color={icon.color} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <PageTitle numberOfLines={1}>{title}</PageTitle>
              {subtitle && (
                <Caption style={{ color: theme.primary, marginTop: 2 }}>{subtitle}</Caption>
              )}
            </View>
            {right ?? (onDismiss && (
              <Pressable onPress={onDismiss} style={btnStyle}>
                <X size={20} color={theme.mutedForeground} />
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
