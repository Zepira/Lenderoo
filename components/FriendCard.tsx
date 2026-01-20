/**
 * FriendCard Component
 *
 * Displays a summary of a friend in a card format
 */

import { View, Pressable } from 'react-native'
import { Mail, Phone, Package } from 'lucide-react-native'
import type { Friend } from 'lib/types'
import { getInitials, formatCount } from 'lib/utils'
import { Card, CardHeader, CardFooter } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

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
    <Pressable onPress={onPress}>
      <Card className="active:scale-95 transition-transform">
        <CardHeader>
          <View className="flex-row gap-3 items-center">
            {/* Friend Avatar */}
            <Avatar className="w-12 h-12">
              {friend.avatarUrl ? (
                <AvatarImage source={{ uri: friend.avatarUrl }} />
              ) : (
                <AvatarFallback className="bg-blue-100">
                  <Text variant="large" className="text-blue-600 font-semibold">
                    {getInitials(friend.name)}
                  </Text>
                </AvatarFallback>
              )}
            </Avatar>

            {/* Friend Info */}
            <View className="flex-1 gap-1.5">
              {/* Friend Name */}
              <Text variant="large" className="font-semibold" numberOfLines={1}>
                {friend.name}
              </Text>

              {/* Contact Info */}
              {detailed && (friend.email || friend.phone) && (
                <View className="gap-1">
                  {friend.email && (
                    <View className="flex-row gap-1.5 items-center">
                      <Mail size={14} color="#888" />
                      <Text variant="small" className="text-muted-foreground" numberOfLines={1}>
                        {friend.email}
                      </Text>
                    </View>
                  )}
                  {friend.phone && (
                    <View className="flex-row gap-1.5 items-center">
                      <Phone size={14} color="#888" />
                      <Text variant="small" className="text-muted-foreground" numberOfLines={1}>
                        {friend.phone}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Active Items Indicator */}
            {hasActiveItems && (
              <View className="bg-blue-100 px-2.5 py-1.5 rounded-full min-w-[32px] items-center">
                <Text variant="large" className="font-bold text-blue-600">
                  {friend.currentItemsBorrowed}
                </Text>
              </View>
            )}
          </View>
        </CardHeader>

        <CardFooter className="justify-between items-center w-full">
          {/* Current Items */}
          <View className="flex-row gap-1.5 items-center">
            <Package size={16} color={hasActiveItems ? '#3b82f6' : '#888'} />
            <Text
              variant="small"
              className={cn(
                hasActiveItems ? 'text-blue-600 font-semibold' : 'text-muted-foreground'
              )}
            >
              {hasActiveItems
                ? formatCount(friend.currentItemsBorrowed, 'item')
                : 'No active items'}
            </Text>
          </View>

          {/* Total Items Borrowed */}
          {detailed && friend.totalItemsBorrowed > 0 && (
            <Text variant="muted">
              {formatCount(friend.totalItemsBorrowed, 'item')} total
            </Text>
          )}
        </CardFooter>
      </Card>
    </Pressable>
  )
}
