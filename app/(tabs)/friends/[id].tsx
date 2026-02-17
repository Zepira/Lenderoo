import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { ScrollView, View, Alert, Pressable, Platform } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import * as LucideIcons from "lucide-react-native";
import { ItemCard } from "components/ItemCard";
import { FloatingBackButton } from "components/FloatingBackButton";
import { getInitials, formatCount } from "lib/utils";
import type { Item } from "lib/types";
import { SafeAreaWrapper } from "@/components/SafeAreaWrapper";
import {
  getFriendUserById,
  getItemsBorrowedByFriend,
  getItemsOwnedByFriend,
  removeFriend,
  type FriendUser,
} from "@/lib/friends-service";
import {
  createBorrowRequest,
  getBorrowRequestsForItem,
} from "@/lib/borrow-requests-service";
import type { BorrowRequestWithDetails } from "@/lib/types";
import * as toast from "@/lib/toast";

// Convert item data from DB to Item type
function convertItemFromDb(data: any): Item {
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    description: data.description,
    category: data.category,
    images: data.images,
    borrowedBy: data.borrowed_by,
    borrowedDate: data.borrowed_date ? new Date(data.borrowed_date) : undefined,
    dueDate: data.due_date ? new Date(data.due_date) : undefined,
    returnedDate: data.returned_date ? new Date(data.returned_date) : undefined,
    notes: data.notes,
    metadata: data.metadata,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export default function FriendDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const [friend, setFriend] = useState<FriendUser | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [ownedItems, setOwnedItems] = useState<Item[]>([]);
  const [borrowRequests, setBorrowRequests] = useState<
    Map<string, BorrowRequestWithDetails>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [ownedItemsLoading, setOwnedItemsLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [requestingItemId, setRequestingItemId] = useState<string | null>(null);

  // Load friend data
  useEffect(() => {
    async function loadFriend() {
      if (!id) return;

      try {
        setLoading(true);
        const friendData = await getFriendUserById(id);

        if (!friendData) {
          // Friend not found, go back
          if (navigation.canGoBack()) {
            router.back();
          } else {
            router.push("/(tabs)/friends" as any);
          }
          return;
        }

        setFriend(friendData);
      } catch (error) {
        console.error("Error loading friend:", error);
        toast.error("Failed to load friend details");
      } finally {
        setLoading(false);
      }
    }
    console.log("loading friend");
    loadFriend();
  }, [id, router, navigation]);

  // Load items borrowed by friend
  useEffect(() => {
    async function loadItems() {
      if (!id) return;

      try {
        setItemsLoading(true);
        const itemsData = await getItemsBorrowedByFriend(id);
        const convertedItems = itemsData.map(convertItemFromDb);
        setItems(convertedItems);
      } catch (error) {
        console.error("Error loading items:", error);
      } finally {
        setItemsLoading(false);
      }
    }

    loadItems();
  }, [id]);

  // Load items owned by friend
  useEffect(() => {
    async function loadOwnedItems() {
      if (!id) return;

      try {
        setOwnedItemsLoading(true);
        const itemsData = await getItemsOwnedByFriend(id);
        const convertedItems = itemsData.map(convertItemFromDb);
        setOwnedItems(convertedItems);

        // Load borrow requests for each item
        const requestsMap = new Map<string, BorrowRequestWithDetails>();
        for (const item of convertedItems) {
          try {
            const requests = await getBorrowRequestsForItem(item.id);
            const myPendingRequest = requests.find(
              (r) => r.status === "pending"
            );
            if (myPendingRequest) {
              requestsMap.set(item.id, myPendingRequest);
            }
          } catch (error) {
            console.error(`Error loading requests for item ${item.id}:`, error);
          }
        }
        setBorrowRequests(requestsMap);
      } catch (error) {
        console.error("Error loading owned items:", error);
      } finally {
        setOwnedItemsLoading(false);
      }
    }

    loadOwnedItems();
  }, [id]);

  if (loading || !friend) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text variant="muted">Loading...</Text>
      </View>
    );
  }

  const activeItems = items.filter((item) => !item.returnedDate);
  const returnedItems = items.filter((item) => item.returnedDate);
  const totalItemsBorrowed = items.length;
  const currentItemsBorrowed = activeItems.length;

  const handleDelete = async () => {
    if (!friend) return;

    if (activeItems.length > 0) {
      const message = `Cannot delete ${friend.name} because they still have ${
        activeItems.length
      } unreturned item${
        activeItems.length !== 1 ? "s" : ""
      }.\n\nPlease mark items as returned before deleting this friend.`;

      if (Platform.OS === "web") {
        alert(message);
      } else {
        Alert.alert("Cannot Delete Friend", message, [{ text: "OK" }]);
      }
      return;
    }

    const confirmMessage = `Are you sure you want to remove ${friend.name} from your friends? This action cannot be undone.`;

    const confirmed = await (async () => {
      if (Platform.OS === "web") {
        return confirm(confirmMessage);
      } else {
        return new Promise<boolean>((resolve) => {
          Alert.alert("Remove Friend", confirmMessage, [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            {
              text: "Remove",
              style: "destructive",
              onPress: () => resolve(true),
            },
          ]);
        });
      }
    })();

    if (!confirmed) return;

    try {
      setDeleting(true);
      await removeFriend(friend.id);
      toast.success(`Removed ${friend.name} from friends`);

      if (navigation.canGoBack()) {
        router.back();
      } else {
        router.push("/(tabs)/friends" as any);
      }
    } catch (error) {
      console.error("Failed to remove friend:", error);
      toast.error("Failed to remove friend");
    } finally {
      setDeleting(false);
    }
  };

  const handleItemPress = (item: Item) => {
    router.push(`/library/${item.id}` as any);
  };

  const handleRequestBorrow = async (item: Item) => {
    if (!friend) return;

    try {
      setRequestingItemId(item.id);
      await createBorrowRequest(item.id, friend.id);
      toast.success(`Request sent to ${friend.name}`);

      // Reload owned items and requests
      const itemsData = await getItemsOwnedByFriend(friend.id);
      const convertedItems = itemsData.map(convertItemFromDb);
      setOwnedItems(convertedItems);

      // Reload requests
      const requests = await getBorrowRequestsForItem(item.id);
      const myPendingRequest = requests.find((r) => r.status === "pending");
      setBorrowRequests((prev) => {
        const newMap = new Map(prev);
        if (myPendingRequest) {
          newMap.set(item.id, myPendingRequest);
        }
        return newMap;
      });
    } catch (error: any) {
      console.error("Error requesting item:", error);
      toast.error(error.message || "Failed to send request");
    } finally {
      setRequestingItemId(null);
    }
  };

  const handleCancelRequest = async (item: Item) => {
    const request = borrowRequests.get(item.id);
    if (!request) return;

    try {
      setRequestingItemId(item.id);
      // Import the cancel function
      const { cancelBorrowRequest } = await import(
        "@/lib/borrow-requests-service"
      );
      await cancelBorrowRequest(request.id);
      toast.success("Request cancelled");

      // Remove from requests map
      setBorrowRequests((prev) => {
        const newMap = new Map(prev);
        newMap.delete(item.id);
        return newMap;
      });
    } catch (error: any) {
      console.error("Error cancelling request:", error);
      toast.error(error.message || "Failed to cancel request");
    } finally {
      setRequestingItemId(null);
    }
  };

  const getItemStatus = (item: Item) => {
    const hasPendingRequest = borrowRequests.has(item.id);

    if (item.borrowedBy) {
      return {
        text: `Borrowed by ${item.borrowedBy === id ? "them" : "someone"}`,
        color: "text-gray-500",
      };
    }
    if (hasPendingRequest) {
      return { text: "Request Pending", color: "text-blue-600" };
    }
    return { text: "Available", color: "text-green-600" };
  };

  return (
    <SafeAreaWrapper>
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
                    {currentItemsBorrowed}
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
                    {totalItemsBorrowed}
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

            {/* Their Items Section */}
            <View className="gap-3">
              <View className="flex-row justify-between items-center">
                <Text variant="h3" className="font-semibold">
                  Their Items
                </Text>
                <Text variant="small" className="text-muted-foreground">
                  {formatCount(ownedItems.length, "item")}
                </Text>
              </View>

              {ownedItemsLoading ? (
                <View className="p-4 items-center">
                  <Text variant="small" className="text-muted-foreground">
                    Loading...
                  </Text>
                </View>
              ) : ownedItems.length === 0 ? (
                <View className="p-4 items-center gap-2">
                  <LucideIcons.Package size={40} color="#9ca3af" />
                  <Text
                    variant="default"
                    className="text-muted-foreground text-center"
                  >
                    {friend.name.split(" ")[0]} hasn't added any items yet
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {ownedItems.map((item) => {
                    const status = getItemStatus(item);
                    const hasPendingRequest = borrowRequests.has(item.id);
                    const isAvailable = !item.borrowedBy && !hasPendingRequest;
                    const isRequesting = requestingItemId === item.id;

                    return (
                      <View key={item.id} className="gap-2">
                        <ItemCard item={item} onPress={() => {}} />
                        <View className="flex-row items-center justify-between px-2">
                          <Text variant="small" className={status.color}>
                            {status.text}
                          </Text>
                          {isAvailable && (
                            <Button
                              size="sm"
                              onPress={() => handleRequestBorrow(item)}
                              disabled={isRequesting}
                            >
                              <LucideIcons.Send size={14} />
                              <Text>Request to Borrow</Text>
                            </Button>
                          )}
                          {hasPendingRequest && (
                            <Button
                              size="sm"
                              variant="outline"
                              onPress={() => handleCancelRequest(item)}
                              disabled={isRequesting}
                            >
                              <Text>Cancel Request</Text>
                            </Button>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
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
    </SafeAreaWrapper>
  );
}
