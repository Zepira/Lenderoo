import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { ItemList } from "components/ItemList";
import { useItems } from "hooks/useItems";
import { useFriends } from "hooks/useFriends";
import { seedDemoData } from "lib/database";
import type { ItemStatus } from "lib/types";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { SafeAreaWrapper } from "@/components/SafeAreaWrapper";

type FilterTab = "all" | "available" | "lent";

export default function ItemsScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  // Determine filter based on active tab
  const filter = useMemo(() => {
    if (activeFilter === "available") {
      return { status: "available" as ItemStatus };
    }
    if (activeFilter === "lent") {
      return { status: "borrowed" as ItemStatus };
    }
    return undefined; // All items
  }, [activeFilter]);

  const { items, loading, refresh } = useItems(filter);
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
    router.push(`/library/${item.id}` as any);
  };

  const handleAddItem = () => {
    router.push("/add-item");
  };

  // Fetch all items once for counting
  const { items: allItems } = useItems();

  // Calculate counts from all items
  const allCount = allItems.length;
  const availableCount = useMemo(() => {
    return allItems.filter((item) => !item.borrowedBy && !item.returnedDate)
      .length;
  }, [allItems]);
  const lentCount = useMemo(() => {
    return allItems.filter((item) => !!item.borrowedBy && !item.returnedDate)
      .length;
  }, [allItems]);

  return (
    <SafeAreaWrapper>
      {/* Filter Tabs */}
      <View className="flex-row p-3 gap-2 bg-background border-b border-border">
        <Button
          variant={activeFilter === "all" ? "default" : "outline"}
          isSelected={activeFilter === "all"}
          className="flex-auto"
          onPress={() => setActiveFilter("all")}
        >
          <Text>All ({allCount})</Text>
        </Button>
        <Button
          variant={activeFilter === "available" ? "default" : "outline"}
          isSelected={activeFilter === "available"}
          className="flex-auto"
          onPress={() => setActiveFilter("available")}
        >
          <Text>Available ({availableCount})</Text>
        </Button>
        <Button
          variant={activeFilter === "lent" ? "default" : "outline"}
          isSelected={activeFilter === "lent"}
          className="flex-auto"
          onPress={() => setActiveFilter("lent")}
        >
          <Text>Lent Out ({lentCount})</Text>
        </Button>
      </View>

      <ItemList
        items={items}
        friendsMap={friendsMap}
        onItemPress={handleItemPress}
        onRefresh={refresh}
        loading={loading}
        emptyState={{
          title:
            activeFilter === "all"
              ? "No items yet"
              : activeFilter === "available"
              ? "No available items"
              : "No items lent out",
          message:
            activeFilter === "all"
              ? "Start tracking items in your library"
              : activeFilter === "available"
              ? "All your items are currently lent out"
              : "You haven't lent anything out yet",
          actionLabel: "Add an Item",
          onAction: handleAddItem,
        }}
      />
    </SafeAreaWrapper>
  );
}
