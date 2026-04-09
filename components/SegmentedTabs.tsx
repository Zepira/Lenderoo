import { View, Pressable } from "react-native";
import { THEME } from "@/lib/theme";
import { useThemeContext } from "@/contexts/ThemeContext";
import { TinyLabel } from "@/components/ui/typography";

export interface SegmentedTab {
  key: string;
  label: string;
  count?: number;
}

interface SegmentedTabsProps {
  tabs: SegmentedTab[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function SegmentedTabs({ tabs, activeKey, onChange }: SegmentedTabsProps) {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 20,
        padding: 6,
        flexDirection: "row",
        gap: 4,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      {tabs.map(({ key, label, count }) => {
        const active = activeKey === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 14,
              alignItems: "center",
              backgroundColor: active ? THEME.light.primary : "transparent",
            }}
          >
            <TinyLabel
              style={{ color: active ? "white" : theme.mutedForeground }}
              className="normal-case tracking-normal"
            >
              {label}
            </TinyLabel>
            {count !== undefined && count > 0 && (
              <TinyLabel
                style={{
                  color: active ? "rgba(255,255,255,0.7)" : theme.mutedForeground,
                  fontSize: 9,
                }}
              >
                {count}
              </TinyLabel>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
