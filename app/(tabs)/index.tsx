import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Construction, Plus } from "lucide-react-native";
import { ItemList } from "components/ItemList";
import { useActiveItems } from "hooks/useItems";
import { useFriends } from "hooks/useFriends";
import { seedDemoData } from "lib/database";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";
import { useThemeContext } from "@/contexts/ThemeContext";

export default function ItemsScreen() {
  const { items, loading, refresh } = useActiveItems();
  const { friends } = useFriends();

  // Seed demo data on first load
  useEffect(() => {
    seedDemoData();
  }, []);

  // Create a map of friend IDs to Friend objects for ItemList
  const friendsMap = useMemo(() => {
    return friends.reduce((acc, friend) => {
      acc[friend.id] = friend;
      return acc;
    }, {} as Record<string, (typeof friends)[0]>);
  }, [friends]);
  const { activeTheme } = useThemeContext();

  const isDark = activeTheme === "dark";

  const handleItemPress = (item: (typeof items)[0]) => {
    router.push(`/item/${item.id}` as any);
  };

  const handleAddItem = () => {
    router.push("/add-item");
  };

  return (
    <View className="flex-1 bg-background items-center justify-center space-y-4">
      <Construction
        size={150}
        color={isDark ? THEME.dark.primary : THEME.light.primary}
      />
      <Text className="h1">This page is under construction.</Text>
    </View>
  );
}
