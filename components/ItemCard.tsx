/**
 * ItemCard Component
 *
 * Displays a summary of an item in a card format
 */

import { Card, XStack, YStack, Text, Image, Avatar } from "tamagui";
import * as Icons from "@tamagui/lucide-icons";
import type { Item, Friend, ItemStatus } from "lib/types";
import {
  formatDate,
  formatRelativeTime,
  daysUntilDue,
  getInitials,
  calculateItemStatus,
} from "lib/utils";
import { CategoryBadge } from "./CategoryBadge";
import { StatusBadge } from "./StatusBadge";

interface ItemCardProps {
  /** The item to display */
  item: Item;
  /** Friend information for the borrower */
  friend: Friend;
  /** Press handler for the card */
  onPress?: () => void;
  /** Whether to show detailed information */
  detailed?: boolean;
}

export function ItemCard({
  item,
  friend,
  onPress,
  detailed = false,
}: ItemCardProps) {
  console.log("Rendering ItemCard for item:", item);
  const status: ItemStatus = calculateItemStatus(item);
  const isOverdue = status === "overdue";
  const daysUntil = item.dueDate ? daysUntilDue(item.dueDate) : undefined;

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
        <XStack gap="$3" items="flex-start">
          {/* Item Image or Placeholder */}
          <YStack
            width={80}
            height={80}
            rounded="$3"
            bg="$gray4"
            overflow="hidden"
            items="center"
            justify="center"
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                width={80}
                height={80}
                resizeMode="cover"
              />
            ) : (
              <Icons.Package size={32} color="$gray10" />
            )}
          </YStack>

          {/* Item Info */}
          <YStack flex={1} gap="$2">
            {/* Item Name */}
            <Text
              fontSize="$5"
              fontWeight="600"
              color="$color"
              numberOfLines={2}
            >
              {item.name}
            </Text>

            {/* Category Badge */}
            <CategoryBadge category={item.category} size="sm" />

            {/* Borrowed By */}
            <XStack gap="$2" items="center">
              <Avatar circular size="$2">
                {friend.avatarUrl ? (
                  <Avatar.Image src={friend.avatarUrl} />
                ) : (
                  <Avatar.Fallback bg="$blue5">
                    <Text fontSize="$2" color="$blue11" fontWeight="600">
                      {getInitials(friend.name)}
                    </Text>
                  </Avatar.Fallback>
                )}
              </Avatar>
              <Text fontSize="$3" color="$gray11" numberOfLines={1}>
                {friend.name}
              </Text>
            </XStack>
          </YStack>
        </XStack>
      </Card.Header>

      <Card.Footer padded>
        <XStack justify="space-between" items="center" width="100%">
          {/* Left side: Status or Date */}
          <YStack gap="$1">
            {item.dueDate && !item.returnedDate && (
              <XStack gap="$1.5" items="center">
                <Icons.Clock
                  size={14}
                  color={isOverdue ? "$red10" : "$gray10"}
                />
                <Text
                  fontSize="$2"
                  color={isOverdue ? "$red10" : "$gray11"}
                  fontWeight={isOverdue ? "600" : "400"}
                >
                  {isOverdue
                    ? `Overdue by ${Math.abs(daysUntil!)} day${
                        Math.abs(daysUntil!) !== 1 ? "s" : ""
                      }`
                    : `Due ${formatRelativeTime(item.dueDate)}`}
                </Text>
              </XStack>
            )}
            {!item.dueDate && !item.returnedDate && (
              <Text fontSize="$2" color="$gray11">
                Borrowed {formatRelativeTime(item.borrowedDate)}
              </Text>
            )}
            {item.returnedDate && (
              <Text fontSize="$2" color="$green10">
                Returned {formatDate(item.returnedDate)}
              </Text>
            )}
          </YStack>

          {/* Right side: Status Badge */}
          <StatusBadge status={status} size="sm" />
        </XStack>

        {/* Detailed Info (optional) */}
        {detailed && item.description && (
          <YStack
            mt="$2"
            pt="$2"
            borderTopWidth={1}
            borderTopColor="$borderColor"
          >
            <Text fontSize="$3" color="$gray11" numberOfLines={2}>
              {item.description}
            </Text>
          </YStack>
        )}
      </Card.Footer>
    </Card>
  );
}
