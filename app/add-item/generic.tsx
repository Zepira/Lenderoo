import { useState } from "react";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import {
  YStack,
  XStack,
  Text,
  Input,
  TextArea,
  Button,
  ScrollView,
  Label,
  Select,
  Adapt,
  Sheet,
} from "tamagui";
import { Check, ChevronDown } from "@tamagui/lucide-icons";
import { Platform } from "react-native";
import { useFriends, useCreateItem } from "hooks";
import { CATEGORY_CONFIG, type ItemCategory } from "lib/constants";
import { createItemSchema } from "lib/validation";

export default function AddGenericItemScreen() {
  const { category: categoryParam } = useLocalSearchParams<{
    category: string;
  }>();
  const category = (categoryParam || "other") as ItemCategory;
  const router = useRouter();
  const { friends } = useFriends();
  const { createItem, loading } = useCreateItem();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [borrowedBy, setBorrowedBy] = useState("");
  const [notes, setNotes] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    try {
      setErrors({});

      const itemData = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        borrowedBy: borrowedBy || undefined,
        borrowedDate: borrowedBy ? new Date() : undefined,
        notes: notes.trim() || undefined,
      };

      createItemSchema.parse(itemData);

      await createItem({
        ...itemData,
        userId: "demo-user",
      });

      router.back();
      router.back(); // Go back twice to return to items list
    } catch (error) {
      if (error && typeof error === "object" && "issues" in error) {
        const zodError = error as {
          issues: Array<{ path: Array<string | number>; message: string }>;
        };
        const fieldErrors: Record<string, string> = {};
        zodError.issues.forEach((err) => {
          if (err.path.length > 0) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error("Failed to create item:", error);
        setErrors({ general: "Failed to add item. Please try again." });
      }
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const categoryLabel = CATEGORY_CONFIG[category]?.label || "Item";

  return (
    <>
      <Stack.Screen
        options={{
          title: `Add ${categoryLabel}`,
          presentation: "modal",
          headerLeft: () => (
            <Button chromeless onPress={handleCancel} disabled={loading}>
              Cancel
            </Button>
          ),
        }}
      />

      <ScrollView flex={1} bg="$background">
        <YStack p="$4" gap="$4">
          {errors.general && (
            <YStack
              p="$3"
              bg="$red2"
              rounded="$3"
              borderWidth={1}
              borderColor="$red7"
            >
              <Text color="$red11" fontSize="$3">
                {errors.general}
              </Text>
            </YStack>
          )}

          {/* Item Name */}
          <YStack gap="$2">
            <Label htmlFor="name" fontSize="$4" fontWeight="600">
              {categoryLabel} Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChangeText={setName}
              placeholder={`e.g., ${
                category === "tool"
                  ? "Power Drill"
                  : category === "clothing"
                  ? "Winter Jacket"
                  : "Item name"
              }`}
              borderColor={errors.name ? "$red7" : "$borderColor"}
              disabled={loading}
            />
            {errors.name && (
              <Text color="$red10" fontSize="$2">
                {errors.name}
              </Text>
            )}
          </YStack>

          {/* Description */}
          <YStack gap="$2">
            <Label htmlFor="description" fontSize="$4" fontWeight="600">
              Description
            </Label>
            <TextArea
              id="description"
              value={description}
              onChangeText={setDescription}
              placeholder="Add any details about the item..."
              numberOfLines={3}
              borderColor={errors.description ? "$red7" : "$borderColor"}
              disabled={loading}
            />
            {errors.description && (
              <Text color="$red10" fontSize="$2">
                {errors.description}
              </Text>
            )}
          </YStack>

          {/* Friend Selector */}
          <YStack gap="$2">
            <Label htmlFor="borrowedBy" fontSize="$4" fontWeight="600">
              Lending To (Optional)
            </Label>
            <Text fontSize="$3" color="$gray11">
              Leave empty to add to your library without lending it out
            </Text>
            {friends.length === 0 ? (
              <YStack gap="$2" p="$3" bg="$gray2" rounded="$3">
                <Text color="$gray11" fontSize="$3">
                  You haven't added any friends yet. You can add this item to
                  your library now and lend it out later.
                </Text>
                <Button
                  size="$3"
                  variant="outlined"
                  onPress={() => router.push("/add-friend" as any)}
                >
                  Add a Friend
                </Button>
              </YStack>
            ) : (
              <>
                <Select
                  id="borrowedBy"
                  value={borrowedBy}
                  onValueChange={setBorrowedBy}
                >
                  <Select.Trigger iconAfter={ChevronDown}>
                    <Select.Value placeholder="Add to library (don't lend out)" />
                  </Select.Trigger>

                  <Adapt when="sm" platform="touch">
                    <Sheet
                      native={Platform.OS === "ios"}
                      modal
                      dismissOnSnapToBottom
                    >
                      <Sheet.Frame>
                        <Sheet.ScrollView>
                          <Adapt.Contents />
                        </Sheet.ScrollView>
                      </Sheet.Frame>
                      <Sheet.Overlay
                        animation="lazy"
                        enterStyle={{ opacity: 0 }}
                        exitStyle={{ opacity: 0 }}
                      />
                    </Sheet>
                  </Adapt>

                  <Select.Content>
                    <Select.Viewport minW={200}>
                      <Select.Group>
                        <Select.Label>Friends</Select.Label>
                        {friends.map((friend, idx) => (
                          <Select.Item
                            key={friend.id}
                            index={idx}
                            value={friend.id}
                          >
                            <Select.ItemText>{friend.name}</Select.ItemText>
                            <Select.ItemIndicator marginLeft="auto">
                              <Check size={16} />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Group>
                    </Select.Viewport>
                  </Select.Content>
                </Select>
                {errors.borrowedBy && (
                  <Text color="$red10" fontSize="$2">
                    {errors.borrowedBy}
                  </Text>
                )}
              </>
            )}
          </YStack>

          {/* Notes */}
          <YStack gap="$2">
            <Label htmlFor="notes" fontSize="$4" fontWeight="600">
              Notes
            </Label>
            <TextArea
              id="notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes or conditions..."
              numberOfLines={2}
              borderColor={errors.notes ? "$red7" : "$borderColor"}
              disabled={loading}
            />
            {errors.notes && (
              <Text color="$red10" fontSize="$2">
                {errors.notes}
              </Text>
            )}
          </YStack>

          {/* Action Buttons */}
          <XStack gap="$3" pt="$4">
            <Button
              flex={1}
              variant="outlined"
              onPress={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              flex={1}
              bg="$blue10"
              color="white"
              onPress={handleSubmit}
              disabled={loading || !name.trim()}
            >
              {loading
                ? "Saving..."
                : borrowedBy
                ? `Add & Lend ${categoryLabel}`
                : `Add to Library`}
            </Button>
          </XStack>
        </YStack>
      </ScrollView>
    </>
  );
}
