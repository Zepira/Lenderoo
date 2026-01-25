import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View, Alert, Pressable } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import * as LucideIcons from "lucide-react-native";
import { useFriend, useDeleteFriend, useFriendItems } from "hooks/useFriends";
import { ItemCard } from "components/ItemCard";
import { FloatingBackButton } from "components/FloatingBackButton";
import { getInitials, formatCount } from "lib/utils";
import type { Item } from "lib/types";

export default function FriendDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { friend, loading } = useFriend(id!);
  const { items, loading: itemsLoading } = useFriendItems(id!);
  const { deleteFriend, loading: deleting } = useDeleteFriend();

  useEffect(() => {
    if (!loading && !friend) {
      // Friend not found, go back
      router.back();
    }
  }, [loading, friend, router]);

  if (loading || !friend) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text variant="muted">Loading...</Text>
      </View>
    );
  }

  const activeItems = items.filter((item) => !item.returnedDate);
  const returnedItems = items.filter((item) => item.returnedDate);

  const handleEdit = () => {
    // TODO: Navigate to edit screen
    console.log("Edit friend:", friend.id);
  };

  const handleDelete = () => {
    if (activeItems.length > 0) {
      Alert.alert(
        "Cannot Delete Friend",
        `Cannot delete ${friend.name} because they still have ${
          activeItems.length
        } unreturned item${
          activeItems.length !== 1 ? "s" : ""
        }.\n\nPlease mark items as returned before deleting this friend.`,
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Delete Friend",
      `Are you sure you want to delete ${friend.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFriend(friend.id);
              router.back();
            } catch (error) {
              console.error("Failed to delete friend:", error);
            }
          },
        },
      ]
    );
  };

  const handleItemPress = (item: Item) => {
    router.push(`/item/${item.id}` as any);
  };

  return (
    <View className="flex-1 bg-background">
      <FloatingBackButton />

      <ScrollView className="flex-1 bg-background">
        <View className="gap-4">
          {/* Friend Header */}
          <View className="items-center gap-4 p-6 bg-muted">
            <Avatar className="w-24 h-24" alt={friend.name}>
              {friend.avatarUrl ? (
                <AvatarImage source={{ uri: friend.avatarUrl }} />
              ) : (
                <AvatarFallback>
                  <Text variant="h1" className="font-bold">
                    {getInitials(friend.name)}
                  </Text>
                </AvatarFallback>
              )}
            </Avatar>

            <View className="items-center gap-2">
              <Text variant="h1" className="font-bold">
                {friend.name}
              </Text>

              {/* Contact Info */}
              {friend.email && (
                <View className="items-center gap-1">
                  {friend.email && (
                    <View className="flex-row gap-2 items-center">
                      <LucideIcons.Mail size={16} color="#9ca3af" />
                      <Text variant="small" className="text-muted-foreground">
                        {friend.email}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          <View className="p-4 gap-4">
            {/* Statistics */}
            <View className="gap-3">
              <Text variant="h3" className="font-semibold">
                Statistics
              </Text>

              <View className="flex-row gap-3">
                <View className="flex-1 gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg items-center">
                  <Text className="text-4xl font-bold text-blue-600">
                    {friend.currentItemsBorrowed}
                  </Text>
                  <Text
                    variant="small"
                    className="text-muted-foreground text-center"
                  >
                    Currently Borrowed
                  </Text>
                </View>

                <View className="flex-1 gap-2 p-4 bg-muted border border-border rounded-lg items-center">
                  <Text className="text-4xl font-bold">
                    {friend.totalItemsBorrowed}
                  </Text>
                  <Text
                    variant="small"
                    className="text-muted-foreground text-center"
                  >
                    Total Borrowed
                  </Text>
                </View>
              </View>
            </View>

            <Separator />

            {/* Currently Borrowed Items */}
            <View className="gap-3">
              <View className="flex-row justify-between items-center">
                <Text variant="h3" className="font-semibold">
                  Currently Borrowed
                </Text>
                <Text variant="small" className="text-muted-foreground">
                  {formatCount(activeItems.length, "item")}
                </Text>
              </View>

              {activeItems.length === 0 ? (
                <View className="p-4 items-center gap-2">
                  <LucideIcons.CheckCircle size={40} color="#22c55e" />
                  <Text
                    variant="default"
                    className="text-muted-foreground text-center"
                  >
                    {friend.name.split(" ")[0]} doesn't have any of your items
                    right now
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {activeItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      friend={friend}
                      onPress={() => handleItemPress(item)}
                    />
                  ))}
                </View>
              )}
            </View>

            {returnedItems.length > 0 && (
              <>
                <Separator />

                {/* Previously Borrowed Items */}
                <View className="gap-3">
                  <View className="flex-row justify-between items-center">
                    <Text variant="h3" className="font-semibold">
                      Previously Borrowed
                    </Text>
                    <Text variant="small" className="text-muted-foreground">
                      {formatCount(returnedItems.length, "item")}
                    </Text>
                  </View>

                  <View className="gap-3">
                    {returnedItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        friend={friend}
                        onPress={() => handleItemPress(item)}
                      />
                    ))}
                  </View>
                </View>
              </>
            )}

            <Separator />

            {/* Metadata */}
            <View className="gap-2">
              <Text variant="small" className="text-muted-foreground">
                Added {new Date(friend.createdAt).toLocaleDateString()}
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="gap-3 pt-2">
              <Button
                variant="outline"
                onPress={handleDelete}
                disabled={deleting}
                className="border-red-200"
              >
                <LucideIcons.Trash2 size={16} color="#ef4444" />
                <Text className="text-red-600">Delete Friend</Text>
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
