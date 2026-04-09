/**
 * ItemList Component
 *
 * Scrollable 2-column grid of items with pull-to-refresh and empty state.
 */

import {
  FlatList,
  type ListRenderItemInfo,
  RefreshControl,
  View,
  ActivityIndicator,
} from "react-native";
import type { Item, Friend } from "lib/types";
import { ItemTile } from "./ItemTile";
import { EmptyState } from "./EmptyState";
import { EMPTY_STATES } from "lib/constants";
import { THEME } from "@/lib/theme";

interface ItemListProps {
  items: Item[];
  friendsMap: Record<string, Friend>;
  onItemPress?: (item: Item) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  loading?: boolean;
  emptyState?: {
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  contentPadding?: number;
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
    const friend = item.borrowedBy ? friendsMap[item.borrowedBy] : undefined;
    if (item.borrowedBy && !friend) return <View style={{ flex: 1 }} />;

    const sublabel = friend ? friend.name : undefined;

    return (
      <View style={{ flex: 1 }}>
        <ItemTile
          item={item}
          sublabel={sublabel}
          onPress={() => onItemPress?.(item)}
        />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <ActivityIndicator size="large" color={THEME.light.primary} />
        </View>
      );
    }
    const cfg = emptyState || EMPTY_STATES.NO_ITEMS;
    return (
      <EmptyState
        icon="Package"
        title={cfg.title}
        message={cfg.message}
        actionLabel={cfg.actionLabel}
        onAction={"onAction" in cfg ? cfg.onAction : undefined}
      />
    );
  };

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{
        paddingHorizontal: contentPadding,
        paddingTop: contentPadding,
        paddingBottom: contentPadding + 80,
        gap: 12,
        flexGrow: 1,
      }}
      ListHeaderComponent={headerComponent}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.light.primary}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    />
  );
}
