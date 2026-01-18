import { useEffect, useMemo } from 'react'
import { router } from 'expo-router'
import { YStack, Button } from 'tamagui'
import { Plus } from '@tamagui/lucide-icons'
import { ItemList } from 'components/ItemList'
import { useActiveItems } from 'hooks/useItems'
import { useFriends } from 'hooks/useFriends'
import { seedDemoData } from 'lib/database'

export default function ItemsScreen() {
  const { items, loading, refresh } = useActiveItems()
  const { friends } = useFriends()

  // Seed demo data on first load
  useEffect(() => {
    seedDemoData()
  }, [])

  // Create a map of friend IDs to Friend objects for ItemList
  const friendsMap = useMemo(() => {
    return friends.reduce(
      (acc, friend) => {
        acc[friend.id] = friend
        return acc
      },
      {} as Record<string, (typeof friends)[0]>
    )
  }, [friends])

  const handleItemPress = (item: typeof items[0]) => {
    // TODO: Navigate to item detail screen
    console.log('Item pressed:', item.name)
  }

  const handleAddItem = () => {
    router.push('/add-item')
  }

  return (
    <YStack flex={1} bg="$background">
      <ItemList
        items={items}
        friendsMap={friendsMap}
        onItemPress={handleItemPress}
        onRefresh={refresh}
        loading={loading}
        emptyState={{
          title: 'No items yet',
          message: 'Start tracking items you\'ve lent to friends',
          actionLabel: 'Add Your First Item',
          onAction: handleAddItem,
        }}
      />

      {/* Floating Action Button */}
      {items.length > 0 && (
        <Button
          circular
          size="$6"
          position="absolute"
          bottom={24}
          right={16}
          elevation="$4"
          themeInverse
          icon={Plus}
          onPress={handleAddItem}
          pressStyle={{ scale: 0.95 }}
          animation="bouncy"
        />
      )}
    </YStack>
  )
}
