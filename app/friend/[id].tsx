import { useState, useEffect } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  YStack,
  XStack,
  Text,
  Button,
  ScrollView,
  Avatar,
  Separator,
  AlertDialog,
} from "tamagui";
import * as Icons from "@tamagui/lucide-icons";
import { useFriend, useDeleteFriend, useFriendItems } from "hooks/useFriends";
import { ItemCard } from "components/ItemCard";
import { EmptyState } from "components/EmptyState";
import { getInitials, formatCount } from "lib/utils";
import type { Item } from "lib/types";

export default function FriendDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { friend, loading } = useFriend(id!);
  const { items, loading: itemsLoading } = useFriendItems(id!);
  const { deleteFriend, loading: deleting } = useDeleteFriend();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !friend) {
      // Friend not found, go back
      router.back();
    }
  }, [loading, friend, router]);

  if (loading || !friend) {
    return (
      <YStack flex={1} items="center" justify="center" bg="$background">
        <Text color="$gray11">Loading...</Text>
      </YStack>
    );
  }

  const activeItems = items.filter((item) => !item.returnedDate);
  const returnedItems = items.filter((item) => item.returnedDate);

  const handleEdit = () => {
    // TODO: Navigate to edit screen
    console.log("Edit friend:", friend.id);
  };

  const handleDelete = async () => {
    if (activeItems.length > 0) {
      alert(
        `Cannot delete ${friend.name} because they still have ${
          activeItems.length
        } unreturned item${activeItems.length !== 1 ? "s" : ""}.`
      );
      setDeleteDialogOpen(false);
      return;
    }

    try {
      await deleteFriend(friend.id);
      setDeleteDialogOpen(false);
      router.back();
    } catch (error) {
      console.error("Failed to delete friend:", error);
    }
  };

  const handleItemPress = (item: Item) => {
    router.push(`/item/${item.id}` as any);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: friend.name,
          headerRight: () => (
            <Button chromeless onPress={handleEdit} disabled={deleting}>
              <Icons.Edit3 size={20} color="$blue10" />
            </Button>
          ),
        }}
      />

      <ScrollView flex={1} bg="$background">
        <YStack gap="$4">
          {/* Friend Header */}
          <YStack items="center" gap="$4" p="$6" bg="$gray2">
            <Avatar circular size="$10">
              {friend.avatarUrl ? (
                <Avatar.Image src={friend.avatarUrl} />
              ) : (
                <Avatar.Fallback>
                  <Text fontSize="$8" fontWeight="700">
                    {getInitials(friend.name)}
                  </Text>
                </Avatar.Fallback>
              )}
            </Avatar>

            <YStack items="center" gap="$2">
              <Text fontSize="$8" fontWeight="700" color="$color">
                {friend.name}
              </Text>

              {/* Contact Info */}
              {(friend.email || friend.phone) && (
                <YStack items="center" gap="$1">
                  {friend.email && (
                    <XStack gap="$2" items="center">
                      <Icons.Mail size={16} color="$gray10" />
                      <Text fontSize="$3" color="$gray11">
                        {friend.email}
                      </Text>
                    </XStack>
                  )}
                  {friend.phone && (
                    <XStack gap="$2" items="center">
                      <Icons.Phone size={16} color="$gray10" />
                      <Text fontSize="$3" color="$gray11">
                        {friend.phone}
                      </Text>
                    </XStack>
                  )}
                </YStack>
              )}
            </YStack>
          </YStack>

          <YStack p="$4" gap="$4">
            {/* Statistics */}
            <YStack gap="$3">
              <Text fontSize="$5" fontWeight="600" color="$color">
                Statistics
              </Text>

              <XStack gap="$3">
                <YStack
                  flex={1}
                  gap="$2"
                  p="$4"
                  bg="$blue2"
                  borderColor="$blue7"
                  borderWidth={1}
                  rounded="$4"
                  items="center"
                >
                  <Text fontSize="$9" fontWeight="700" color="$blue10">
                    {friend.currentItemsBorrowed}
                  </Text>
                  <Text fontSize="$3" color="$gray11" textAlign="center">
                    Currently Borrowed
                  </Text>
                </YStack>

                <YStack
                  flex={1}
                  gap="$2"
                  p="$4"
                  bg="$gray2"
                  borderColor="$gray7"
                  borderWidth={1}
                  rounded="$4"
                  items="center"
                >
                  <Text fontSize="$9" fontWeight="700" color="$gray12">
                    {friend.totalItemsBorrowed}
                  </Text>
                  <Text fontSize="$3" color="$gray11" textAlign="center">
                    Total Borrowed
                  </Text>
                </YStack>
              </XStack>
            </YStack>

            <Separator />

            {/* Currently Borrowed Items */}
            <YStack gap="$3">
              <XStack justify="space-between" items="center">
                <Text fontSize="$5" fontWeight="600" color="$color">
                  Currently Borrowed
                </Text>
                <Text fontSize="$3" color="$gray11">
                  {formatCount(activeItems.length, "item")}
                </Text>
              </XStack>

              {activeItems.length === 0 ? (
                <YStack p="$4" items="center" gap="$2">
                  <Icons.CheckCircle size={40} color="$green10" />
                  <Text fontSize="$4" color="$gray11" textAlign="center">
                    {friend.name.split(" ")[0]} doesn't have any of your items
                    right now
                  </Text>
                </YStack>
              ) : (
                <YStack gap="$3">
                  {activeItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      friend={friend}
                      onPress={() => handleItemPress(item)}
                    />
                  ))}
                </YStack>
              )}
            </YStack>

            {returnedItems.length > 0 && (
              <>
                <Separator />

                {/* Previously Borrowed Items */}
                <YStack gap="$3">
                  <XStack justify="space-between" items="center">
                    <Text fontSize="$5" fontWeight="600" color="$color">
                      Previously Borrowed
                    </Text>
                    <Text fontSize="$3" color="$gray11">
                      {formatCount(returnedItems.length, "item")}
                    </Text>
                  </XStack>

                  <YStack gap="$3">
                    {returnedItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        friend={friend}
                        onPress={() => handleItemPress(item)}
                      />
                    ))}
                  </YStack>
                </YStack>
              </>
            )}

            <Separator />

            {/* Metadata */}
            <YStack gap="$2">
              <Text fontSize="$3" color="$gray10">
                Added {new Date(friend.createdAt).toLocaleDateString()}
              </Text>
            </YStack>

            {/* Action Buttons */}
            <YStack gap="$3" pt="$2">
              <Button
                size="$5"
                variant="outlined"
                color="$red10"
                borderColor="$red7"
                icon={Icons.Trash2}
                onPress={() => setDeleteDialogOpen(true)}
                disabled={deleting}
              >
                Delete Friend
              </Button>
            </YStack>
          </YStack>
        </YStack>
      </ScrollView>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay
            key="overlay"
            animation="quick"
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
          <AlertDialog.Content
            bordered
            elevate
            key="content"
            animation={[
              "quick",
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
            exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
            gap="$4"
          >
            <YStack gap="$2">
              <AlertDialog.Title fontSize="$6" fontWeight="700">
                Delete Friend
              </AlertDialog.Title>
              <AlertDialog.Description fontSize="$4" color="$gray11">
                {activeItems.length > 0 ? (
                  <>
                    Cannot delete {friend.name} because they still have{" "}
                    {formatCount(activeItems.length, "unreturned item")}.
                    {"\n\n"}
                    Please mark items as returned before deleting this friend.
                  </>
                ) : (
                  <>
                    Are you sure you want to delete {friend.name}? This action
                    cannot be undone.
                  </>
                )}
              </AlertDialog.Description>
            </YStack>

            <XStack gap="$3" justify="flex-end">
              <AlertDialog.Cancel asChild>
                <Button variant="outlined" disabled={deleting}>
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              {activeItems.length === 0 && (
                <AlertDialog.Action asChild>
                  <Button
                    bg="$red10"
                    color="white"
                    onPress={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </Button>
                </AlertDialog.Action>
              )}
            </XStack>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>
    </>
  );
}
