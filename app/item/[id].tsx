import { useState, useEffect } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  YStack,
  XStack,
  Text,
  Button,
  ScrollView,
  Image,
  Avatar,
  Separator,
  AlertDialog,
} from "tamagui";
import * as Icons from "@tamagui/lucide-icons";
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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !item) {
      // Item not found, go back
      router.back();
    }
  }, [loading, item, router]);

  // Show loading if still loading or if item is borrowed but friend data isn't loaded yet
  if (loading || !item || (item.borrowedBy && !friend)) {
    return (
      <YStack flex={1} items="center" justify="center" bg="$background">
        <Text color="$gray11">Loading...</Text>
      </YStack>
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

  const handleDelete = async () => {
    try {
      await deleteItem(item.id);
      setDeleteDialogOpen(false);
      router.back();
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: item.name,
          headerRight: () => (
            <Button
              chromeless
              onPress={handleEdit}
              disabled={deleting || returning}
            >
              <Icons.Edit3 size={20} color="$blue10" />
            </Button>
          ),
        }}
      />

      <ScrollView flex={1} bg="$background">
        <YStack gap="$4">
          {/* Item Image */}
          <YStack
            width="100%"
            height={300}
            bg="$gray4"
            items="center"
            justify="center"
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                width="100%"
                height={300}
                resizeMode="cover"
              />
            ) : (
              <Icons.Package size={80} color="$gray10" />
            )}
          </YStack>

          <YStack p="$4" gap="$4">
            {/* Header Info */}
            <YStack gap="$3">
              <XStack justify="space-between" items="flex-start" gap="$3">
                <YStack flex={1} gap="$2">
                  <Text fontSize="$8" fontWeight="700" color="$color">
                    {item.name}
                  </Text>
                  <XStack gap="$2" items="center">
                    <CategoryBadge category={item.category} size="md" />
                    <StatusBadge status={status} size="md" />
                  </XStack>
                </YStack>
              </XStack>

              {item.description && (
                <Text fontSize="$4" color="$gray11" lineHeight="$4">
                  {item.description}
                </Text>
              )}

              {/* Book Metadata */}
              {item.category === "book" && item.metadata && (
                <YStack gap="$2">
                  {(item.metadata as BookMetadata).author && (
                    <XStack gap="$2" items="center">
                      <Icons.User size={16} color="$gray10" />
                      <Text fontSize="$4" color="$gray11">
                        <Text fontWeight="600">Author:</Text>{" "}
                        {(item.metadata as BookMetadata).author}
                      </Text>
                    </XStack>
                  )}
                  {(item.metadata as BookMetadata).series && (
                    <XStack gap="$2" items="center">
                      <Icons.BookOpen size={16} color="$gray10" />
                      <Text fontSize="$4" color="$gray11">
                        <Text fontWeight="600">Series:</Text>{" "}
                        {(item.metadata as BookMetadata).series}
                        {(item.metadata as BookMetadata).seriesNumber &&
                          ` (Book ${
                            (item.metadata as BookMetadata).seriesNumber
                          })`}
                      </Text>
                    </XStack>
                  )}
                  {(item.metadata as BookMetadata).genre && (
                    <XStack gap="$2" items="flex-start">
                      <Icons.Tag size={16} color="$gray10" />
                      <Text fontSize="$4" color="$gray11" flex={1}>
                        <Text fontWeight="600">Genre:</Text>{" "}
                        {Array.isArray((item.metadata as BookMetadata).genre)
                          ? (item.metadata as BookMetadata).genre?.join(", ")
                          : (item.metadata as BookMetadata).genre}
                      </Text>
                    </XStack>
                  )}
                </YStack>
              )}
            </YStack>

            <Separator />

            {/* Borrower Info or Availability Status */}
            <YStack gap="$3">
              <Text fontSize="$5" fontWeight="600" color="$color">
                {friend ? "Borrowed By" : "Status"}
              </Text>
              {friend ? (
                <XStack
                  gap="$3"
                  items="center"
                  p="$3"
                  bg="$gray2"
                  rounded="$4"
                  pressStyle={{ bg: "$gray3" }}
                  cursor="pointer"
                  onPress={() => router.push(`/friend/${friend.id}` as any)}
                >
                  <Avatar circular size="$5">
                    {friend.avatarUrl ? (
                      <Avatar.Image src={friend.avatarUrl} />
                    ) : (
                      <Avatar.Fallback bg="$blue5">
                        <Text fontSize="$5" color="$blue11" fontWeight="600">
                          {getInitials(friend.name)}
                        </Text>
                      </Avatar.Fallback>
                    )}
                  </Avatar>
                  <YStack flex={1} gap="$1">
                    <Text fontSize="$5" fontWeight="600" color="$color">
                      {friend.name}
                    </Text>
                    {friend.email && (
                      <Text fontSize="$3" color="$gray11">
                        {friend.email}
                      </Text>
                    )}
                  </YStack>
                  <Icons.ChevronRight size={20} color="$gray10" />
                </XStack>
              ) : (
                <XStack
                  gap="$3"
                  items="center"
                  p="$3"
                  bg="$green2"
                  rounded="$4"
                >
                  <Icons.Package size={24} color="$green10" />
                  <YStack flex={1} gap="$1">
                    <Text fontSize="$5" fontWeight="600" color="$green11">
                      Available
                    </Text>
                    <Text fontSize="$3" color="$green10">
                      This item is not currently lent out
                    </Text>
                  </YStack>
                </XStack>
              )}
            </YStack>

            <Separator />

            {/* Date Information - only show for borrowed/returned items */}
            {(item.borrowedDate || item.returnedDate) && (
              <YStack gap="$3">
                <Text fontSize="$5" fontWeight="600" color="$color">
                  Timeline
                </Text>

                {item.borrowedDate && (
                  <YStack gap="$2">
                    <XStack justify="space-between" items="center">
                      <Text fontSize="$4" color="$gray11">
                        Borrowed Date
                      </Text>
                      <Text fontSize="$4" fontWeight="500" color="$color">
                        {formatDate(item.borrowedDate)}
                      </Text>
                    </XStack>
                    <Text fontSize="$3" color="$gray10">
                      {formatRelativeTime(item.borrowedDate)}
                    </Text>
                  </YStack>
                )}

                {item.dueDate && (
                  <YStack gap="$2">
                    <XStack justify="space-between" items="center">
                      <Text fontSize="$4" color="$gray11">
                        Due Date
                      </Text>
                      <Text
                        fontSize="$4"
                        fontWeight="500"
                        color={isOverdue ? "$red10" : "$color"}
                      >
                        {formatDate(item.dueDate)}
                      </Text>
                    </XStack>
                    {!isAvailable && daysUntil !== undefined && (
                      <Text
                        fontSize="$3"
                        color={isOverdue ? "$red10" : "$gray10"}
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
                  </YStack>
                )}

                {item.returnedDate && (
                  <YStack gap="$2">
                    <XStack justify="space-between" items="center">
                      <Text fontSize="$4" color="$gray11">
                        Returned Date
                      </Text>
                      <Text fontSize="$4" fontWeight="500" color="$green10">
                        {formatDate(item.returnedDate)}
                      </Text>
                    </XStack>
                    <Text fontSize="$3" color="$gray10">
                      {formatRelativeTime(item.returnedDate)}
                    </Text>
                  </YStack>
                )}

                {daysSinceBorrowed > 0 && (
                  <XStack justify="space-between" items="center">
                    <Text fontSize="$4" color="$gray11">
                      Duration
                    </Text>
                    <Text fontSize="$4" fontWeight="500" color="$color">
                      {daysSinceBorrowed} day
                      {daysSinceBorrowed !== 1 ? "s" : ""}
                    </Text>
                  </XStack>
                )}
              </YStack>
            )}

            {(item.borrowedDate || item.returnedDate) && <Separator />}

            {item.notes && (
              <>
                <Separator />
                <YStack gap="$3">
                  <Text fontSize="$5" fontWeight="600" color="$color">
                    Notes
                  </Text>
                  <Text fontSize="$4" color="$gray11" lineHeight="$4">
                    {item.notes}
                  </Text>
                </YStack>
              </>
            )}

            <Separator />

            {/* Metadata */}
            <YStack gap="$2">
              <Text fontSize="$3" color="$gray10">
                Created {formatRelativeTime(item.createdAt)}
              </Text>
              {item.createdAt.getTime() !== item.updatedAt.getTime() && (
                <Text fontSize="$3" color="$gray10">
                  Updated {formatRelativeTime(item.updatedAt)}
                </Text>
              )}
            </YStack>

            {/* Action Buttons */}
            <YStack gap="$3" pt="$2">
              {!isAvailable && item.borrowedBy && (
                <Button
                  size="$5"
                  bg="$green10"
                  color="white"
                  icon={Icons.Check}
                  onPress={handleMarkReturned}
                  disabled={returning || deleting}
                >
                  {returning ? "Marking as Returned..." : "Mark as Returned"}
                </Button>
              )}

              <Button
                size="$5"
                variant="outlined"
                color="$red10"
                borderColor="$red7"
                icon={Icons.Trash2}
                onPress={() => setDeleteDialogOpen(true)}
                disabled={deleting || returning}
              >
                Delete Item
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
                Delete Item
              </AlertDialog.Title>
              <AlertDialog.Description fontSize="$4" color="$gray11">
                Are you sure you want to delete "{item.name}"? This action
                cannot be undone.
              </AlertDialog.Description>
            </YStack>

            <XStack gap="$3" justify="flex-end">
              <AlertDialog.Cancel asChild>
                <Button variant="outlined" disabled={deleting}>
                  Cancel
                </Button>
              </AlertDialog.Cancel>
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
            </XStack>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>
    </>
  );
}
