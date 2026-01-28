import * as React from "react";
import { View } from "react-native";
import { router, Tabs } from "expo-router";
import {
  BookText,
  Users,
  Search,
  Home,
  UserCog,
  Plus,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeSwitcher } from "../../components/ThemeSwitcher";
import { useThemeContext } from "../../contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { show } from "@/lib/toast";

export default function TabLayout() {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const insets = useSafeAreaInsets();

  // Memoize the header right component to prevent recreation
  const HeaderRight = React.useCallback(() => <ThemeSwitcher />, []);

  const screenOptions = React.useMemo(
    () => ({
      tabBarActiveTintColor: isDark ? THEME.dark.primary : THEME.light.primary,
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
      // headerShadowVisible: false,
      // headerStyle: {
      //   backgroundColor: isDark
      //     ? THEME.dark.background
      //     : THEME.light.background,
      // },
      // headerTintColor: isDark ? THEME.dark.foreground : THEME.light.foreground,
      // headerRight: HeaderRight,
      // headerBackVisible: true,
      headerShown: false,
    }),
    [isDark, insets.bottom]
  );

  const handleAddItem = () => {
    router.push("/add-item");
  };

  return (
    <View style={{ flex: 1 }}>
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
            tabBarIcon: ({ color, size }) => (
              <Search color={color} size={size} />
            ),
            headerTitle: "Explore",
          }}
        />
        <Tabs.Screen
          name="friends"
          options={{
            title: "Friends",
            tabBarIcon: ({ color, size }) => (
              <Users color={color} size={size} />
            ),
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

      {/* Floating Action Button - Appears over all tabs */}
      <Button
        size="icon"
        className="absolute  right-4 w-16 h-16 rounded-full shadow-2xl  bg-primary items-center justify-center"
        style={{
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          bottom: insets.bottom + 80,
        }}
        onPress={handleAddItem}
      >
        <Plus size={28} />
      </Button>
    </View>
  );
}
