/**
 * ItemCard Component
 *
 * Displays a summary of an item in a card format
 */

import {
  View,
  Image as RNImage,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { Clock, Package } from "lucide-react-native";
import type { Item, Friend, ItemStatus, BookMetadata } from "lib/types";
import {
  formatDate,
  formatRelativeTime,
  daysUntilDue,
  getInitials,
  calculateItemStatus,
} from "lib/utils";
import { CategoryBadge } from "./CategoryBadge";
import { StatusBadge } from "./StatusBadge";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface InfoPanelProps {
  /** The item to display */
  item: Item;
  /** Friend information for the borrower (optional for available items) */
  friend?: Friend;
  /** Press handler for the card */
  onPress?: () => void;
  /** Whether to show detailed information */
  detailed?: boolean;
}

export function InfoPanelCard({
  item,
  friend,
  onPress,
  detailed = false,
}: InfoPanelProps) {
  const status: ItemStatus = calculateItemStatus(item);
  // const isOverdue = status === "overdue";
  // const daysUntil = item.dueDate ? daysUntilDue(item.dueDate) : undefined;

  return (
    <TouchableOpacity onPress={onPress}>
      <Card>
        <CardHeader>
          <View>
            {/* Item Image or Placeholder */}
            <View className="w-20 h-20 rounded-lg overflow-hidden items-center justify-center bg-muted">
              {item.imageUrl ? (
                <RNImage
                  source={{ uri: item.imageUrl }}
                  style={{ width: 80, height: 80 }}
                  resizeMode="cover"
                />
              ) : (
                <Package size={32} color="#888" />
              )}
            </View>

            {/* Item Info */}
            <View className="flex-1 gap-2">
              {/* Item Name */}
              <Text variant="large" className="font-semibold" numberOfLines={2}>
                {item.name}
              </Text>

              {/* Book Metadata - Author and Series */}
              {item.category === "book" && item.metadata && (
                <View className="gap-0.5">
                  {(item.metadata as BookMetadata).author && (
                    <Text
                      variant="small"
                      className="text-muted-foreground"
                      numberOfLines={1}
                    >
                      by {(item.metadata as BookMetadata).author}
                    </Text>
                  )}
                  {(item.metadata as BookMetadata).series && (
                    <Text variant="muted" numberOfLines={1}>
                      {(item.metadata as BookMetadata).series}
                      {(item.metadata as BookMetadata).seriesNumber &&
                        ` #${(item.metadata as BookMetadata).seriesNumber}`}
                    </Text>
                  )}
                </View>
              )}

              {/* Category Badge */}
              <CategoryBadge category={item.category} size="sm" />

              {/* Borrowed By (only show if item is borrowed) */}
              {friend && (
                <View className="flex-row gap-2 items-center">
                  <Avatar alt={`${friend.name}'s Avatar`}>
                    <AvatarImage source={{ uri: friend.avatarUrl }} />
                    <AvatarFallback>
                      <Text> {getInitials(friend.name)}</Text>
                    </AvatarFallback>
                  </Avatar>

                  <Text variant="small" numberOfLines={1}>
                    {friend.name}
                  </Text>
                </View>
              )}

              {/* Available label for items not lent out */}
              {!friend && !item.returnedDate && (
                <Text variant="small" className="text-green-600 font-medium">
                  Available
                </Text>
              )}
            </View>
          </View>
        </CardHeader>

        <CardFooter className="flex-col items-start gap-2">
          <View className="flex-row justify-between items-center w-full">
            {/* Left side: Status or Date */}
            <View className="gap-1">
              {/* {item.dueDate && !item.returnedDate && friend && (
                <View className="flex-row gap-1.5 items-center">
                  <Clock size={14} color={isOverdue ? "red" : "gray"} />
                  <Text
                    variant="muted"
                    className={cn(
                      isOverdue ? "text-red-600 font-semibold" : ""
                    )}
                  >
                    {isOverdue
                      ? `Overdue by ${Math.abs(daysUntil!)} day${
                          Math.abs(daysUntil!) !== 1 ? "s" : ""
                        }`
                      : `Due ${formatRelativeTime(item.dueDate)}`}
                  </Text>
                </View>
              )} */}
              {!item.dueDate &&
                !item.returnedDate &&
                friend &&
                item.borrowedDate && (
                  <Text variant="muted">
                    Borrowed {formatRelativeTime(item.borrowedDate)}
                  </Text>
                )}
              {!friend && !item.returnedDate && (
                <Text variant="muted">
                  Added {formatRelativeTime(item.createdAt)}
                </Text>
              )}
              {item.returnedDate && (
                <Text variant="muted">
                  Returned {formatDate(item.returnedDate)}
                </Text>
              )}
            </View>

            {/* Right side: Status Badge */}
            <StatusBadge status={status} size="sm" />
          </View>

          {/* Detailed Info (optional) */}
          {detailed && item.description && (
            <View className="mt-2 pt-2 border-t border-border w-full">
              <Text variant="small" numberOfLines={2}>
                {item.description}
              </Text>
            </View>
          )}
        </CardFooter>
      </Card>
    </TouchableOpacity>
  );
}
