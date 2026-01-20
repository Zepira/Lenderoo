import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Plus } from "lucide-react-native";
import { ItemList } from "components/ItemList";
import { useActiveItems } from "hooks/useItems";
import { useFriends } from "hooks/useFriends";
import { seedDemoData } from "lib/database";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

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

  const handleItemPress = (item: (typeof items)[0]) => {
    router.push(`/item/${item.id}` as any);
  };

  const handleAddItem = () => {
    router.push("/add-item");
  };

  return (
    <View className="flex-1 bg-background">
      <ItemList
        items={items}
        friendsMap={friendsMap}
        onItemPress={handleItemPress}
        onRefresh={refresh}
        loading={loading}
        emptyState={{
          title: "No items yet",
          message: "Start tracking items you've lent to friends",
          actionLabel: "Add Your First Item",
          onAction: handleAddItem,
        }}
      />

      {/* Floating Action Button */}
      {items.length > 0 && (
        <Button
          size="icon"
          className="absolute bottom-6 right-4 w-14 h-14 rounded-full shadow-lg"
          onPress={handleAddItem}
        >
          <Plus size={24} />
        </Button>
      )}
    </View>
  );
}
