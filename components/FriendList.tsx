/**
 * FriendList Component
 *
 * Scrollable list of friends with pull-to-refresh and empty state
 */

import {
  FlatList,
  type ListRenderItemInfo,
  RefreshControl,
  View,
  ActivityIndicator,
} from "react-native";
import type { Friend } from "lib/types";
import { FriendCard } from "./FriendCard";
import { EmptyState } from "./EmptyState";
import { EMPTY_STATES } from "lib/constants";
import { Button } from "./ui/button";
import { Plus } from "lucide-react-native";
import { Text } from "@/components/ui/text";

interface FriendListProps {
  /** Array of friends to display */
  friends: Friend[];
  /** Handler when a friend is pressed */
  onFriendPress?: (friend: Friend) => void;
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

  /** Show detailed friend cards */
  detailed?: boolean;

  /** Optional header component to render above the list */
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  onAddFriend?: () => void;
}

export function FriendList({
  friends,
  onFriendPress,
  onRefresh,
  refreshing = false,
  loading = false,
  emptyState,
  contentPadding = 16,

  detailed = false,
  ListHeaderComponent,
  onAddFriend,
}: FriendListProps) {
  console.log("friends", friends);
  const renderItem = ({ item }: ListRenderItemInfo<Friend>) => {
    return (
      <View className="pb-3">
        <FriendCard
          friend={item}
          onPress={() => onFriendPress?.(item)}
          detailed={detailed}
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

    const emptyConfig = emptyState || EMPTY_STATES.NO_FRIENDS;

    return (
      <EmptyState
        icon="Users"
        title={emptyConfig.title}
        message={emptyConfig.message}
        actionLabel={emptyConfig.actionLabel}
        onAction={"onAction" in emptyConfig ? emptyConfig.onAction : undefined}
      />
    );
  };

  const keyExtractor = (item: Friend) => item.id;

  return (
    <>
      <FlatList
        data={friends}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{
          paddingHorizontal: contentPadding,
          paddingTop: contentPadding,
          paddingBottom: contentPadding + 80, // Extra padding for FAB
          flexGrow: 1,
        }}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
      />
      <Button onPress={onAddFriend} className="mt-2">
        <Plus size={16} />
        <Text>Add new friend</Text>
      </Button>
    </>
  );
}
