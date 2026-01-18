/**
 * ItemList Component
 *
 * Scrollable list of items with pull-to-refresh and empty state
 */

import { FlatList, type ListRenderItemInfo, RefreshControl } from 'react-native'
import { YStack, Spinner } from 'tamagui'
import type { Item, Friend } from 'lib/types'
import { ItemCard } from './ItemCard'
import { EmptyState } from './EmptyState'
import { EMPTY_STATES } from 'lib/constants'

interface ItemListProps {
  /** Array of items to display */
  items: Item[]
  /** Map of friend ID to Friend object */
  friendsMap: Record<string, Friend>
  /** Handler when an item is pressed */
  onItemPress?: (item: Item) => void
  /** Handler for pull to refresh */
  onRefresh?: () => void
  /** Whether the list is refreshing */
  refreshing?: boolean
  /** Whether the list is loading */
  loading?: boolean
  /** Custom empty state */
  emptyState?: {
    title: string
    message: string
    actionLabel?: string
    onAction?: () => void
  }
  /** Content padding */
  contentPadding?: number
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
}: ItemListProps) {
  const renderItem = ({ item }: ListRenderItemInfo<Item>) => {
    const friend = friendsMap[item.borrowedBy]

    // If friend not found, skip rendering this item
    if (!friend) return null

    return (
      <YStack pb="$3">
        <ItemCard item={item} friend={friend} onPress={() => onItemPress?.(item)} />
      </YStack>
    )
  }

  const renderEmpty = () => {
    if (loading) {
      return (
        <YStack flex={1} items="center" justify="center" p="$6">
          <Spinner size="large" color="$blue10" />
        </YStack>
      )
    }

    const emptyConfig = emptyState || EMPTY_STATES.NO_ITEMS

    return (
      <EmptyState
        icon="Package"
        title={emptyConfig.title}
        message={emptyConfig.message}
        actionLabel={emptyConfig.actionLabel}
        onAction={'onAction' in emptyConfig ? emptyConfig.onAction : undefined}
      />
    )
  }

  const keyExtractor = (item: Item) => item.id

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={{
        paddingHorizontal: contentPadding,
        paddingTop: contentPadding,
        paddingBottom: contentPadding + 80, // Extra padding for FAB
        flexGrow: 1,
      }}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    />
  )
}
