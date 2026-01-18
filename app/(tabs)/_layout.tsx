import { Tabs } from "expo-router";
import { useTheme } from "tamagui";
import { Package, Users, Settings } from "@tamagui/lucide-icons";

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.blue10.val,
        tabBarInactiveTintColor: theme.gray10?.val ?? "#A0A0A0", // Fallback to a default gray color
        tabBarStyle: {
          backgroundColor: theme.background.val,
          borderTopColor: theme.borderColor.val,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        headerStyle: {
          backgroundColor: theme.background.val,
          borderBottomColor: theme.borderColor.val,
        },
        headerTintColor: theme.color.val,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Items",
          tabBarIcon: ({ color, size }) => (
            <Package color={color as any} size={size} />
          ),
          headerTitle: "My Items",
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color, size }) => (
            <Users color={color as any} size={size} />
          ),
          headerTitle: "Friends",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Settings color={color as any} size={size} />
          ),
          headerTitle: "Settings",
        }}
      />
    </Tabs>
  );
}
