import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScrollView, View, Alert } from "react-native";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Label } from "@/components/ui/label";
import { useFriends, useUpdateItem } from "hooks";
import { CATEGORY_CONFIG, type ItemCategory } from "lib/constants";
import { createItemSchema } from "lib/validation";
import { FloatingBackButton } from "components/FloatingBackButton";
import { ImagePicker } from "components/ImagePicker";
import { cn } from "lib/utils";
import { SafeAreaWrapper } from "@/components/SafeAreaWrapper";

export default function EditGenericItemScreen() {
  const params = useLocalSearchParams<{
    itemId: string;
    category: string;
    name?: string;
    description?: string;
    imageUrl?: string;
    notes?: string;
    borrowedBy?: string;
  }>();
  const category = (params.category || "other") as ItemCategory;
  const router = useRouter();
  const { friends } = useFriends();
  const { updateItem, loading } = useUpdateItem();

  // Form state
  const [name, setName] = useState(params.name || "");
  const [description, setDescription] = useState(params.description || "");
  const [imageUrl, setImageUrl] = useState(params.imageUrl || "");
  const [borrowedBy, setBorrowedBy] = useState(params.borrowedBy || "");
  const [notes, setNotes] = useState(params.notes || "");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    try {
      setErrors({});

      const updates = {
        name: name.trim(),
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        borrowedBy: borrowedBy || undefined,
        notes: notes.trim() || undefined,
      };

      createItemSchema.parse({
        ...updates,
        category,
        borrowedDate: borrowedBy ? new Date() : undefined,
      });

      await updateItem(params.itemId!, updates);

      router.back();
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

  const selectedFriend = friends.find((f) => f.id === borrowedBy);

  const handleSelectFriend = () => {
    if (friends.length === 0) return;

    Alert.alert(
      "Select Friend",
      "Choose who to lend this item to",
      [
        ...friends.map((friend) => ({
          text: friend.name,
          onPress: () => setBorrowedBy(friend.id),
        })),
        {
          text: "Don't lend out (add to library)",
          onPress: () => setBorrowedBy(""),
        },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaWrapper>
      <FloatingBackButton />

      <ScrollView className="flex-1 bg-background">
        <View className="p-4 gap-4">
          {errors.general && (
            <View className="p-3 bg-red-50 rounded-lg border border-red-200">
              <Text variant="small" className="text-red-600">
                {errors.general}
              </Text>
            </View>
          )}

          {/* Item Name */}
          <View className="gap-2">
            <Label nativeID="name" className="font-semibold">
              {categoryLabel} Name *
            </Label>
            <Input
              value={name}
              onChangeText={setName}
              placeholder={`e.g., ${
                category === "tool"
                  ? "Power Drill"
                  : category === "clothing"
                  ? "Winter Jacket"
                  : "Item name"
              }`}
              className={cn(errors.name && "border-red-500")}
              editable={!loading}
              autoFocus
            />
            {errors.name && (
              <Text variant="muted" className="text-red-600">
                {errors.name}
              </Text>
            )}
          </View>

          {/* Description */}
          <View className="gap-2">
            <Label nativeID="description" className="font-semibold">
              Description
            </Label>
            <Textarea
              value={description}
              onChangeText={setDescription}
              placeholder="Add any details about the item..."
              numberOfLines={3}
              className={cn(errors.description && "border-red-500")}
              editable={!loading}
            />
            {errors.description && (
              <Text variant="muted" className="text-red-600">
                {errors.description}
              </Text>
            )}
          </View>

          {/* Item Image */}
          <View className="gap-2">
            <Label className="font-semibold">Item Photo (Optional)</Label>
            <ImagePicker
              imageUrl={imageUrl}
              onImageSelected={(uri) => setImageUrl(uri)}
              onImageRemoved={() => setImageUrl("")}
            />
            <Text variant="small" className="text-muted-foreground">
              Take a photo or choose from your library
            </Text>
          </View>

          {/* Friend Selector */}
          <View className="gap-2">
            <Label nativeID="borrowedBy" className="font-semibold">
              Lending To (Optional)
            </Label>
            <Text variant="muted">
              Leave empty to add to your library without lending it out
            </Text>
            {friends.length === 0 ? (
              <View className="gap-2 p-3 bg-muted rounded-lg">
                <Text variant="muted">
                  You haven't added any friends yet. You can add this item to
                  your library now and lend it out later.
                </Text>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => router.push("/add-friend" as any)}
                >
                  <Text>Add a Friend</Text>
                </Button>
              </View>
            ) : (
              <>
                <Button
                  variant="outline"
                  onPress={handleSelectFriend}
                  disabled={loading}
                >
                  <Text>
                    {selectedFriend
                      ? selectedFriend.name
                      : "Add to library (don't lend out)"}
                  </Text>
                </Button>
                {errors.borrowedBy && (
                  <Text variant="muted" className="text-red-600">
                    {errors.borrowedBy}
                  </Text>
                )}
              </>
            )}
          </View>

          {/* Notes */}
          <View className="gap-2">
            <Label nativeID="notes" className="font-semibold">
              Notes
            </Label>
            <Textarea
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes or conditions..."
              numberOfLines={2}
              className={cn(errors.notes && "border-red-500")}
              editable={!loading}
            />
            {errors.notes && (
              <Text variant="muted" className="text-red-600">
                {errors.notes}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onPress={handleCancel}
              disabled={loading}
              className="flex-1"
            >
              <Text>Cancel</Text>
            </Button>
            <Button
              onPress={handleSubmit}
              disabled={loading || !name.trim()}
              className="flex-1 bg-blue-600"
            >
              <Text className="text-white">
                {loading ? "Updating..." : `Update ${categoryLabel}`}
              </Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
