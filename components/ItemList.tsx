/**
 * ItemList Component
 *
 * Scrollable list of items with pull-to-refresh and empty state
 */

import {
  FlatList,
  type ListRenderItemInfo,
  RefreshControl,
  View,
  ActivityIndicator,
} from "react-native";
import type { Item, Friend } from "lib/types";
import { ItemCard } from "./ItemCard";
import { EmptyState } from "./EmptyState";
import { EMPTY_STATES } from "lib/constants";

interface ItemListProps {
  /** Array of items to display */
  items: Item[];
  /** Map of friend ID to Friend object */
  friendsMap: Record<string, Friend>;
  /** Handler when an item is pressed */
  onItemPress?: (item: Item) => void;
  /** Handler for pull to refresh */
  onRefresh?: () => void;
  /** Whether the list is refreshing */
  refreshing?: boolean;
  /** Whether the list is loading */
  loading?: boolean;
  /** Custom empty state */
  emptyState?: {
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  /** Content padding */
  contentPadding?: number;
  /** Optional header component to render above the list */
  headerComponent?: React.ReactElement;
}

export function ItemList({
  items,
  friendsMap,
  onItemPress,
  onRefresh,
  refreshing = false,
  loading = false,
  emptyState,
  contentPadding = 16,
  headerComponent,
}: ItemListProps) {
  const renderItem = ({ item }: ListRenderItemInfo<Item>) => {
    // Get friend if item is borrowed (borrowedBy will be undefined for available items)
    const friend = item.borrowedBy ? friendsMap[item.borrowedBy] : undefined;

    // For lent items, skip if friend not found (data integrity issue)
    // For available items, friend will be undefined which is expected
    if (item.borrowedBy && !friend) return null;

    return (
      <View className="pb-3">
        <ItemCard
          item={item}
          friend={friend}
          onPress={() => onItemPress?.(item)}
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

    const emptyConfig = emptyState || EMPTY_STATES.NO_ITEMS;

    return (
      <EmptyState
        icon="Package"
        title={emptyConfig.title}
        message={emptyConfig.message}
        actionLabel={emptyConfig.actionLabel}
        onAction={"onAction" in emptyConfig ? emptyConfig.onAction : undefined}
      />
    );
  };

  const keyExtractor = (item: Item) => item.id;

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={{
        paddingHorizontal: contentPadding,
        paddingTop: headerComponent ? 0 : contentPadding,
        paddingBottom: contentPadding + 80, // Extra padding for FAB
        flexGrow: 1,
      }}
      ListHeaderComponent={headerComponent}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    />
  );
}
