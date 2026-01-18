import { router } from 'expo-router'
import { YStack, Button } from 'tamagui'
import { Plus } from '@tamagui/lucide-icons'
import { FriendList } from 'components/FriendList'
import { useFriends } from 'hooks/useFriends'

export default function FriendsScreen() {
  const { friends, loading, refresh } = useFriends()

  const handleFriendPress = (friend: typeof friends[0]) => {
    // TODO: Navigate to friend detail screen
    console.log('Friend pressed:', friend.name)
  }

  const handleAddFriend = () => {
    router.push('/add-friend')
  }

  return (
    <YStack flex={1} bg="$background">
      <FriendList
        friends={friends}
        onFriendPress={handleFriendPress}
        onRefresh={refresh}
        loading={loading}
        detailed
        emptyState={{
          title: 'No friends yet',
          message: 'Add friends to start lending them items',
          actionLabel: 'Add Your First Friend',
          onAction: handleAddFriend,
        }}
      />

      {/* Floating Action Button */}
      {friends.length > 0 && (
        <Button
          circular
          size="$6"
          position="absolute"
          bottom={24}
          right={16}
          elevation="$4"
          themeInverse
          icon={Plus}
          onPress={handleAddFriend}
          pressStyle={{ scale: 0.95 }}
          animation="bouncy"
        />
      )}
    </YStack>
  )
}
