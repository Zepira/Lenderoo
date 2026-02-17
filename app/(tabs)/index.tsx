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
import { useActiveItems, useBorrowedByMeItems } from "hooks/useItems";
import { useFriends } from "hooks/useFriends";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";
import { useThemeContext } from "@/contexts/ThemeContext";
import type { Item } from "lib/types";
import { SafeAreaWrapper } from "@/components/SafeAreaWrapper";

export default function ItemsScreen() {
  const { items: lentOutItems, loading: lentOutLoading, refresh: refreshLentOut } = useActiveItems();
  const { items: borrowedByMeItems, loading: borrowedLoading, refresh: refreshBorrowed } = useBorrowedByMeItems();
  const { friends } = useFriends();

  const loading = lentOutLoading || borrowedLoading;

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

  const refresh = async () => {
    await Promise.all([refreshLentOut(), refreshBorrowed()]);
  };

  const renderBorrowedByMeItem = ({ item }: { item: Item }) => {
    return (
      <View className="pb-3">
        <ItemCard
          item={item}
          onPress={() => handleItemPress(item)}
        />
      </View>
    );
  };

  const renderHeader = () => (
    <SafeAreaWrapper>
      {/* Items I've Borrowed Section */}
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text variant="h2" className="font-bold">
            Borrowed by Me
          </Text>
          {borrowedByMeItems.length > 0 && (
            <Text variant="small" className="text-muted-foreground">
              {borrowedByMeItems.length} {borrowedByMeItems.length === 1 ? "item" : "items"}
            </Text>
          )}
        </View>

        {borrowedLoading ? (
          <View className="p-8 items-center">
            <ActivityIndicator size="small" color="#3b82f6" />
          </View>
        ) : borrowedByMeItems.length > 0 ? (
          <View className="gap-3">
            {borrowedByMeItems.map((item) => renderBorrowedByMeItem({ item }))}
          </View>
        ) : (
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
        )}
      </View>

      {/* Items I've Lent Out Section Header */}
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text variant="h2" className="font-bold">
            Lent Out
          </Text>
          {lentOutItems.length > 0 && (
            <Text variant="small" className="text-muted-foreground">
              {lentOutItems.length} {lentOutItems.length === 1 ? "item" : "items"}
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
        data={lentOutItems}
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
