import { Tabs } from "expo-router";
import { BookText, Users, Search, Home, UserCog } from "lucide-react-native";
import { ThemeSwitcher } from "../../components/ThemeSwitcher";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#3b82f6", // blue-600
        tabBarInactiveTintColor: "#9ca3af", // gray-400
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: 8,
          marginBottom: 4,
          height: 60,
        },
        headerShadowVisible: false,
        headerRight: () => <ThemeSwitcher />,
      }}
    >
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
