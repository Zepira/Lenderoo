/**
 * FriendCard Component
 *
 * Displays a summary of a friend in a card format
 */

import { Card, XStack, YStack, Text, Avatar } from 'tamagui'
import * as Icons from '@tamagui/lucide-icons'
import type { Friend } from 'lib/types'
import { getInitials, formatCount } from 'lib/utils'

interface FriendCardProps {
  /** The friend to display */
  friend: Friend
  /** Press handler for the card */
  onPress?: () => void
  /** Whether to show detailed information */
  detailed?: boolean
}

export function FriendCard({ friend, onPress, detailed = false }: FriendCardProps) {
  const hasActiveItems = friend.currentItemsBorrowed > 0

  return (
    <Card
      elevate
      size="$4"
      bordered
      animation="bouncy"
      scale={0.98}
      hoverStyle={{ scale: 1 }}
      pressStyle={{ scale: 0.96 }}
      onPress={onPress}
      bg="$background"
      cursor="pointer"
    >
      <Card.Header padded>
        <XStack gap="$3" items="center">
          {/* Friend Avatar */}
          <Avatar circular size="$6">
            {friend.avatarUrl ? (
              <Avatar.Image src={friend.avatarUrl} />
            ) : (
              <Avatar.Fallback bg="$blue5">
                <Text fontSize="$6" color="$blue11" fontWeight="600">
                  {getInitials(friend.name)}
                </Text>
              </Avatar.Fallback>
            )}
          </Avatar>

          {/* Friend Info */}
          <YStack flex={1} gap="$1.5">
            {/* Friend Name */}
            <Text fontSize="$5" fontWeight="600" color="$color" numberOfLines={1}>
              {friend.name}
            </Text>

            {/* Contact Info */}
            {detailed && (friend.email || friend.phone) && (
              <YStack gap="$1">
                {friend.email && (
                  <XStack gap="$1.5" items="center">
                    <Icons.Mail size={14} color="$gray10" />
                    <Text fontSize="$3" color="$gray11" numberOfLines={1}>
                      {friend.email}
                    </Text>
                  </XStack>
                )}
                {friend.phone && (
                  <XStack gap="$1.5" items="center">
                    <Icons.Phone size={14} color="$gray10" />
                    <Text fontSize="$3" color="$gray11" numberOfLines={1}>
                      {friend.phone}
                    </Text>
                  </XStack>
                )}
              </YStack>
            )}
          </YStack>

          {/* Active Items Indicator */}
          {hasActiveItems && (
            <YStack
              bg="$blue5"
              px="$2.5"
              py="$1.5"
              rounded="$10"
              minW={32}
              items="center"
            >
              <Text fontSize="$5" fontWeight="700" color="$blue11">
                {friend.currentItemsBorrowed}
              </Text>
            </YStack>
          )}
        </XStack>
      </Card.Header>

      <Card.Footer padded>
        <XStack justify="space-between" items="center" width="100%">
          {/* Current Items */}
          <XStack gap="$1.5" items="center">
            <Icons.Package size={16} color={hasActiveItems ? '$blue10' : '$gray10'} />
            <Text
              fontSize="$3"
              color={hasActiveItems ? '$blue11' : '$gray11'}
              fontWeight={hasActiveItems ? '600' : '400'}
            >
              {hasActiveItems
                ? formatCount(friend.currentItemsBorrowed, 'item')
                : 'No active items'}
            </Text>
          </XStack>

          {/* Total Items Borrowed */}
          {detailed && friend.totalItemsBorrowed > 0 && (
            <Text fontSize="$2" color="$gray10">
              {formatCount(friend.totalItemsBorrowed, 'item')} total
            </Text>
          )}
        </XStack>
      </Card.Footer>
    </Card>
  )
}
