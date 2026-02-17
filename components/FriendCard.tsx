/**
 * FriendCard Component
 *
 * Displays a summary of a friend in a card format
 */

import { View, Pressable, TouchableOpacity } from "react-native";
import { Mail, Phone, Package, Library } from "lucide-react-native";
import type { Friend } from "lib/types";
import { getInitials, formatCount } from "lib/utils";
import { Card, CardHeader, CardFooter } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface FriendCardProps {
  /** The friend to display */
  friend: Friend;
  /** Press handler for the card */
  onPress?: () => void;
  /** Whether to show detailed information */
  detailed?: boolean;
}

export function FriendCard({
  friend,
  onPress,
  detailed = false,
}: FriendCardProps) {
  const [opacity, setOpacity] = useState(1);
  const hasActiveItems = friend.currentItemsBorrowed > 0;

  return (
    <TouchableOpacity onPress={onPress} style={{ opacity }}>
      <Card>
        <CardHeader>
          <View className="flex-row gap-3 items-center">
            {/* Friend Avatar */}
            <Avatar className="w-12 h-12" alt={friend.name}>
              {friend.avatarUrl ? (
                <AvatarImage source={{ uri: friend.avatarUrl }} />
              ) : (
                <AvatarFallback className="">
                  <Text variant="large" className=" font-semibold">
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
              {detailed && friend.email && (
                <View className="gap-1">
                  {friend.email && (
                    <View className="flex-row gap-1.5 items-center">
                      <Mail size={14} />
                      <Text
                        variant="small"
                        className="text-muted-foreground"
                        numberOfLines={1}
                      >
                        {friend.email}
                      </Text>
                    </View>
                  )}
                  {/* {friend.phone && (
                    <View className="flex-row gap-1.5 items-center">
                      <Phone size={14} color="#888" />
                      <Text
                        variant="small"
                        className="text-muted-foreground"
                        numberOfLines={1}
                      >
                        {friend.phone}
                      </Text>
                    </View>
                  )} */}
                </View>
              )}
            </View>

            {/* Active Items Indicator */}
            {hasActiveItems && (
              <View className="bg-muted-foreground px-2.5 py-1.5 rounded-full min-w-[32px] items-center">
                <Text variant="large" className="font-bold ">
                  {friend.currentItemsBorrowed}
                </Text>
              </View>
            )}
          </View>
        </CardHeader>

        <CardFooter className="justify-between items-center w-full">
          {/* Items they're borrowing from you */}
          <View className="flex-row gap-1.5 items-center">
            <Package size={16} color={hasActiveItems ? "#3b82f6" : "#888"} />
            <Text
              variant="small"
              className={cn(
                hasActiveItems
                  ? "text-blue-600 font-semibold"
                  : "text-muted-foreground"
              )}
            >
              {hasActiveItems
                ? `${friend.currentItemsBorrowed} borrowed`
                : "Nothing borrowed"}
            </Text>
          </View>

          {/* Items in their library */}
          {friend.ownedItemsCount !== undefined && friend.ownedItemsCount > 0 && (
            <View className="flex-row gap-1.5 items-center">
              <Library size={16} color="#888" />
              <Text variant="small" className="text-muted-foreground">
                {friend.ownedItemsCount} {friend.ownedItemsCount === 1 ? 'item' : 'items'}
              </Text>
            </View>
          )}
        </CardFooter>
      </Card>
    </TouchableOpacity>
  );
}
