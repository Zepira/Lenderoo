import * as React from "react";
import { Tabs } from "expo-router";
import { BookText, Users, Search, Home, UserCog } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeSwitcher } from "../../components/ThemeSwitcher";
import { useThemeContext } from "../../contexts/ThemeContext";
import { THEME } from "@/lib/theme";

export default function TabLayout() {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const insets = useSafeAreaInsets();

  // Memoize the header right component to prevent recreation
  const HeaderRight = React.useCallback(() => <ThemeSwitcher />, []);

  const screenOptions = React.useMemo(
    () => ({
      tabBarActiveTintColor: isDark ? THEME.dark.accent : THEME.light.accent,
      tabBarInactiveTintColor: isDark
        ? THEME.dark.mutedForeground
        : THEME.light.mutedForeground,
      tabBarStyle: {
        paddingTop: 8,
        paddingBottom: insets.bottom,
        height: 60 + insets.bottom,
        backgroundColor: isDark
          ? THEME.dark.background
          : THEME.light.background,
        borderTopColor: isDark ? THEME.dark.border : THEME.light.border,
      },
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: isDark
          ? THEME.dark.background
          : THEME.light.background,
      },
      headerTintColor: isDark ? THEME.dark.foreground : THEME.light.foreground,
      headerRight: HeaderRight,
    }),
    [isDark, insets.bottom]
  );

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          headerTitle: "Home",
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "My Library",
          tabBarIcon: ({ color, size }) => (
            <BookText color={color} size={size} />
          ),
          headerTitle: "My Library",
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
          headerTitle: "Explore",
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          headerTitle: "Friends",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <UserCog color={color} size={size} />
          ),
          headerTitle: "Profile",
        }}
      />
    </Tabs>
  );
}
