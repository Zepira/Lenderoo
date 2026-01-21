import { useState, useEffect } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View, Image, Alert, Pressable } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import * as LucideIcons from "lucide-react-native";
import { useItem, useDeleteItem, useMarkItemReturned } from "hooks/useItems";
import { useFriend } from "hooks/useFriends";
import { CategoryBadge } from "components/CategoryBadge";
import { StatusBadge } from "components/StatusBadge";
import {
  formatDate,
  formatRelativeTime,
  daysUntilDue,
  daysBorrowed,
  getInitials,
  calculateItemStatus,
} from "lib/utils";
import type { ItemStatus, BookMetadata } from "lib/types";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { item, loading } = useItem(id!);
  const { friend } = useFriend(item?.borrowedBy ?? null);
  const { deleteItem, loading: deleting } = useDeleteItem();
  const { markReturned, loading: returning } = useMarkItemReturned();

  useEffect(() => {
    if (!loading && !item) {
      // Item not found, go back
      router.back();
    }
  }, [loading, item, router]);

  // Show loading if still loading or if item is borrowed but friend data isn't loaded yet
  if (loading || !item || (item.borrowedBy && !friend)) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text variant="muted">Loading...</Text>
      </View>
    );
  }

  const status: ItemStatus = calculateItemStatus(item);
  const isAvailable = status === "available";
  const isOverdue = status === "overdue";
  const daysUntil = item.dueDate ? daysUntilDue(item.dueDate) : undefined;
  const daysSinceBorrowed = item.borrowedDate
    ? daysBorrowed(item.borrowedDate, item.returnedDate)
    : 0;

  const handleMarkReturned = async () => {
    try {
      await markReturned(item.id);
      router.back();
    } catch (error) {
      console.error("Failed to mark item as returned:", error);
    }
  };

  const handleEdit = () => {
    // TODO: Navigate to edit screen
    console.log("Edit item:", item.id);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Item",
      `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteItem(item.id);
              router.back();
            } catch (error) {
              console.error("Failed to delete item:", error);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: item.name,
          headerRight: () => (
            <Pressable
              onPress={handleEdit}
              disabled={deleting || returning}
              className="p-2"
            >
              <LucideIcons.Edit3 size={20} color="#3b82f6" />
            </Pressable>
          ),
        }}
      />

      <ScrollView className="flex-1 bg-background">
        <View className="gap-4">
          {/* Item Image */}
          <View className="w-full h-[300px] bg-muted items-center justify-center">
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={{ width: "100%", height: 300 }}
                resizeMode="cover"
              />
            ) : (
              <LucideIcons.Package size={80} color="#9ca3af" />
            )}
          </View>

          <View className="p-4 gap-4">
            {/* Header Info */}
            <View className="gap-3">
              <View className="flex-row justify-between items-start gap-3">
                <View className="flex-1 gap-2">
                  <Text variant="h1" className="font-bold">
                    {item.name}
                  </Text>
                  <View className="flex-row gap-2 items-center">
                    <CategoryBadge category={item.category} size="md" />
                    <StatusBadge status={status} size="md" />
                  </View>
                </View>
              </View>

              {item.description && (
                <Text variant="default" className="text-muted-foreground">
                  {item.description}
                </Text>
              )}

              {/* Book Metadata */}
              {item.category === "book" && item.metadata && (
                <View className="gap-2">
                  {(item.metadata as BookMetadata).author && (
                    <View className="flex-row gap-2 items-center">
                      <LucideIcons.User size={16} color="#9ca3af" />
                      <Text variant="default" className="text-muted-foreground">
                        <Text className="font-semibold">Author:</Text>{" "}
                        {(item.metadata as BookMetadata).author}
                      </Text>
                    </View>
                  )}
                  {(item.metadata as BookMetadata).series && (
                    <View className="flex-row gap-2 items-center">
                      <LucideIcons.BookOpen size={16} color="#9ca3af" />
                      <Text variant="default" className="text-muted-foreground">
                        <Text className="font-semibold">Series:</Text>{" "}
                        {(item.metadata as BookMetadata).series}
                        {(item.metadata as BookMetadata).seriesNumber &&
                          ` (Book ${
                            (item.metadata as BookMetadata).seriesNumber
                          })`}
                      </Text>
                    </View>
                  )}
                  {(item.metadata as BookMetadata).genre && (
                    <View className="flex-row gap-2 items-start">
                      <LucideIcons.Tag size={16} color="#9ca3af" />
                      <Text
                        variant="default"
                        className="text-muted-foreground flex-1"
                      >
                        <Text className="font-semibold">Genre:</Text>{" "}
                        {Array.isArray((item.metadata as BookMetadata).genre)
                          ? (item.metadata as BookMetadata).genre?.join(", ")
                          : (item.metadata as BookMetadata).genre}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <Separator />

            {/* Borrower Info or Availability Status */}
            <View className="gap-3">
              <Text variant="h3" className="font-semibold">
                {friend ? "Borrowed By" : "Status"}
              </Text>
              {friend ? (
                <Pressable
                  onPress={() => router.push(`/friend/${friend.id}` as any)}
                >
                  <View className="flex-row gap-3 items-center p-3 bg-muted rounded-lg active:bg-muted/80">
                    <Avatar className="w-12 h-12">
                      {friend.avatarUrl ? (
                        <AvatarImage source={{ uri: friend.avatarUrl }} />
                      ) : (
                        <AvatarFallback className="bg-blue-100">
                          <Text
                            variant="default"
                            className="text-blue-600 font-semibold"
                          >
                            {getInitials(friend.name)}
                          </Text>
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <View className="flex-1 gap-1">
                      <Text variant="default" className="font-semibold">
                        {friend.name}
                      </Text>
                      {friend.email && (
                        <Text variant="small" className="text-muted-foreground">
                          {friend.email}
                        </Text>
                      )}
                    </View>
                    <LucideIcons.ChevronRight size={20} color="#9ca3af" />
                  </View>
                </Pressable>
              ) : (
                <View className="flex-row gap-3 items-center p-3 bg-green-50 rounded-lg">
                  <LucideIcons.Package size={24} color="#22c55e" />
                  <View className="flex-1 gap-1">
                    <Text
                      variant="default"
                      className="text-green-600 font-semibold"
                    >
                      Available
                    </Text>
                    <Text variant="small" className="text-green-600">
                      This item is not currently lent out
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <Separator />

            {/* Date Information - only show for borrowed/returned items */}
            {(item.borrowedDate || item.returnedDate) && (
              <View className="gap-3">
                <Text variant="h3" className="font-semibold">
                  Timeline
                </Text>

                {item.borrowedDate && (
                  <View className="gap-2">
                    <View className="flex-row justify-between items-center">
                      <Text variant="default" className="text-muted-foreground">
                        Borrowed Date
                      </Text>
                      <Text variant="default" className="font-medium">
                        {formatDate(item.borrowedDate)}
                      </Text>
                    </View>
                    <Text variant="small" className="text-muted-foreground">
                      {formatRelativeTime(item.borrowedDate)}
                    </Text>
                  </View>
                )}

                {item.dueDate && (
                  <View className="gap-2">
                    <View className="flex-row justify-between items-center">
                      <Text variant="default" className="text-muted-foreground">
                        Due Date
                      </Text>
                      <Text
                        variant="default"
                        className={`font-medium ${
                          isOverdue ? "text-red-600" : ""
                        }`}
                      >
                        {formatDate(item.dueDate)}
                      </Text>
                    </View>
                    {!isAvailable && daysUntil !== undefined && (
                      <Text
                        variant="small"
                        className={
                          isOverdue ? "text-red-600" : "text-muted-foreground"
                        }
                      >
                        {isOverdue
                          ? `Overdue by ${Math.abs(daysUntil)} day${
                              Math.abs(daysUntil) !== 1 ? "s" : ""
                            }`
                          : `Due in ${daysUntil} day${
                              daysUntil !== 1 ? "s" : ""
                            }`}
                      </Text>
                    )}
                  </View>
                )}

                {item.returnedDate && (
                  <View className="gap-2">
                    <View className="flex-row justify-between items-center">
                      <Text variant="default" className="text-muted-foreground">
                        Returned Date
                      </Text>
                      <Text
                        variant="default"
                        className="font-medium text-green-600"
                      >
                        {formatDate(item.returnedDate)}
                      </Text>
                    </View>
                    <Text variant="small" className="text-muted-foreground">
                      {formatRelativeTime(item.returnedDate)}
                    </Text>
                  </View>
                )}

                {daysSinceBorrowed > 0 && (
                  <View className="flex-row justify-between items-center">
                    <Text variant="default" className="text-muted-foreground">
                      Duration
                    </Text>
                    <Text variant="default" className="font-medium">
                      {daysSinceBorrowed} day
                      {daysSinceBorrowed !== 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {(item.borrowedDate || item.returnedDate) && <Separator />}

            {item.notes && (
              <>
                <View className="gap-3">
                  <Text variant="h3" className="font-semibold">
                    Notes
                  </Text>
                  <Text variant="default" className="text-muted-foreground">
                    {item.notes}
                  </Text>
                </View>
                <Separator />
              </>
            )}

            {/* Metadata */}
            <View className="gap-2">
              <Text variant="small" className="text-muted-foreground">
                Created {formatRelativeTime(item.createdAt)}
              </Text>
              {item.createdAt.getTime() !== item.updatedAt.getTime() && (
                <Text variant="small" className="text-muted-foreground">
                  Updated {formatRelativeTime(item.updatedAt)}
                </Text>
              )}
            </View>

            {/* Action Buttons */}
            <View className="gap-3 pt-2">
              {!isAvailable && item.borrowedBy && (
                <Button
                  onPress={handleMarkReturned}
                  disabled={returning || deleting}
                  className="bg-green-600"
                >
                  <LucideIcons.Check size={16} color="white" />
                  <Text className="text-white">
                    {returning ? "Marking as Returned..." : "Mark as Returned"}
                  </Text>
                </Button>
              )}

              <Button
                variant="outline"
                onPress={handleDelete}
                disabled={deleting || returning}
                className="border-red-200"
              >
                <LucideIcons.Trash2 size={16} color="#ef4444" />
                <Text className="text-red-600">Delete Item</Text>
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
