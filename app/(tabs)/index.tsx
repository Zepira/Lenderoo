import { useEffect, useMemo } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Package, Heart } from "lucide-react-native";
import { ItemCard } from "components/ItemCard";
import { useActiveItems } from "hooks/useItems";
import { useFriends } from "hooks/useFriends";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";
import { useThemeContext } from "@/contexts/ThemeContext";
import type { Item } from "lib/types";
import { SafeAreaWrapper } from "@/components/SafeAreaWrapper";

export default function ItemsScreen() {
  const { items, loading, refresh } = useActiveItems();
  const { friends } = useFriends();

  // Create a map of friend IDs to Friend objects
  const friendsMap = useMemo(() => {
    return friends.reduce((acc, friend) => {
      acc[friend.id] = friend;
      return acc;
    }, {} as Record<string, (typeof friends)[0]>);
  }, [friends]);
  const { activeTheme } = useThemeContext();

  const isDark = activeTheme === "dark";

  const handleItemPress = (item: Item) => {
    router.push(`/library/${item.id}` as any);
  };

  const handleAddItem = () => {
    router.push("/add-item");
  };

  const renderHeader = () => (
    <SafeAreaWrapper>
      {/* Items I've Borrowed Section */}
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text variant="h2" className="font-bold">
            Borrowed by Me
          </Text>
        </View>

        {/* Empty state - we don't track items user borrows from others yet */}
        <View className="p-8 items-center gap-3 bg-muted rounded-lg">
          <Package
            size={48}
            color={
              isDark ? THEME.dark.mutedForeground : THEME.light.mutedForeground
            }
          />
          <Text variant="default" className="text-muted-foreground text-center">
            quiet in here
          </Text>
        </View>
      </View>

      {/* Items I've Lent Out Section Header */}
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text variant="h2" className="font-bold">
            Lent Out
          </Text>
          {items.length > 0 && (
            <Text variant="small" className="text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"}
            </Text>
          )}
        </View>
      </View>
    </SafeAreaWrapper>
  );

  const renderItem = ({ item }: { item: Item }) => {
    const friend = item.borrowedBy ? friendsMap[item.borrowedBy] : undefined;

    if (item.borrowedBy && !friend) return null;

    return (
      <View className="pb-3">
        <ItemCard
          item={item}
          friend={friend}
          onPress={() => handleItemPress(item)}
        />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      );
    }

    return (
      <View className="p-8 items-center gap-3 bg-muted rounded-lg">
        <Heart
          size={48}
          color={
            isDark ? THEME.dark.mutedForeground : THEME.light.mutedForeground
          }
        />
        <Text variant="default" className="text-muted-foreground text-center">
          sharing is caring!
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{
          paddingHorizontal: 16,

          paddingBottom: 96, // Extra padding for FAB
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
