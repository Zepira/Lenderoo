import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScrollView, View, Alert, Pressable } from "react-native";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Label } from "@/components/ui/label";
import { Check, ChevronDown, ChevronUp, UserCircle } from "lucide-react-native";
import { useFriends, useUpdateItem, useItems } from "hooks";
import { CATEGORY_CONFIG as CATEGORY_CONFIG_CONSTANTS, type ItemCategory } from "lib/constants";
import { CATEGORY_CONFIG } from "@/lib/category-config";
import { createItemSchema } from "lib/validation";
import { ImagePicker } from "components/ImagePicker";
import { cn } from "lib/utils";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { TinyLabel, BodyStrong, Caption } from "@/components/ui/typography";

export default function EditGenericItemScreen() {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;
  const params = useLocalSearchParams<{
    itemId: string;
    category: string;
    name?: string;
    description?: string;
    imageUrl?: string;
    notes?: string;
    borrowedBy?: string;
    maxBorrowDuration?: string;
    condition?: string;
  }>();
  const category = (params.category || "other") as ItemCategory;
  const router = useRouter();
  const { friends } = useFriends();
  const { updateItem, loading } = useUpdateItem();
  const { items: existingItems } = useItems();

  // Form state
  const [name, setName] = useState(params.name || "");
  const [description, setDescription] = useState(params.description || "");
  const [imageUrl, setImageUrl] = useState(params.imageUrl || "");
  const [borrowedBy, setBorrowedBy] = useState(params.borrowedBy || "");
  const [notes, setNotes] = useState(params.notes || "");
  const [maxBorrowDuration, setMaxBorrowDuration] = useState(params.maxBorrowDuration || "");
  const [condition, setCondition] = useState<"fair" | "good" | "perfect" | "">(
    (params.condition as "fair" | "good" | "perfect" | undefined) || ""
  );
  const [friendPickerOpen, setFriendPickerOpen] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    try {
      setErrors({});

      // Check for duplicates (excluding the current item being edited)
      const duplicates = existingItems.filter((item) => {
        // Skip the current item
        if (item.id === params.itemId) return false;

        return (
          item.category === category &&
          item.name.toLowerCase().trim() === name.toLowerCase().trim()
        );
      });

      if (duplicates.length > 0) {
        const duplicate = duplicates[0];

        Alert.alert(
          "Duplicate Item",
          `"${duplicate.name}" is already in your library. You cannot have two items with the same name.`,
          [{ text: "OK" }]
        );

        setErrors({ name: "This item is already in your library" });
        return;
      }

      const updates = {
        name: name.trim(),
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        borrowedBy: borrowedBy || undefined,
        notes: notes.trim() || undefined,
        metadata: (maxBorrowDuration.trim() || condition)
          ? { maxBorrowDuration: maxBorrowDuration.trim() || undefined, condition: condition || undefined }
          : undefined,
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

  const categoryLabel = CATEGORY_CONFIG_CONSTANTS[category]?.label || "Item";

  const selectedFriend = friends.find((f) => f.id === borrowedBy);
  const cfg = CATEGORY_CONFIG[category];

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}>
      <ScreenHeader
        title={`Edit ${params.name || categoryLabel}`}
        onBack={() => router.back()}
        right={cfg ? (
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: cfg.color + "18", alignItems: "center", justifyContent: "center" }}>
            <cfg.Icon size={18} color={cfg.color} />
          </View>
        ) : undefined}
      />

      <ScrollView className="flex-1">
        <View className="px-4 pt-6 pb-4 gap-4">
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
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 32,
              padding: 24,
              borderWidth: 1,
              borderColor: theme.border,
              gap: 16,
            }}
          >
            <View style={{ gap: 4 }}>
              <TinyLabel>Lend To (Optional)</TinyLabel>
              <Caption>Leave empty to keep in library without lending</Caption>
            </View>

            {friends.length === 0 ? (
              <View style={{ gap: 12 }}>
                <Caption>No friends yet — add friends to lend items to them.</Caption>
                <Button variant="outline" onPress={() => router.push("/add-friend" as any)}>
                  <Text>Add a Friend</Text>
                </Button>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                <Pressable
                  onPress={() => setFriendPickerOpen((v) => !v)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    backgroundColor: isDark ? theme.muted : "#F3F4F6",
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <UserCircle size={20} color={selectedFriend ? theme.primary : theme.mutedForeground} />
                  <BodyStrong
                    style={{ flex: 1, fontSize: 15, color: selectedFriend ? theme.foreground : theme.mutedForeground }}
                  >
                    {selectedFriend ? selectedFriend.name : "Select a friend…"}
                  </BodyStrong>
                  {friendPickerOpen
                    ? <ChevronUp size={18} color={theme.mutedForeground} />
                    : <ChevronDown size={18} color={theme.mutedForeground} />}
                </Pressable>

                {friendPickerOpen && (
                  <View
                    style={{
                      backgroundColor: isDark ? theme.muted : "#F3F4F6",
                      borderRadius: 16,
                      overflow: "hidden",
                    }}
                  >
                    {friends.map((f, i) => (
                      <Pressable
                        key={f.id}
                        onPress={() => { setBorrowedBy(f.id); setFriendPickerOpen(false); }}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 16,
                          paddingVertical: 13,
                          gap: 12,
                          backgroundColor: pressed ? theme.primary + "18" : "transparent",
                          borderTopWidth: i === 0 ? 0 : 1,
                          borderTopColor: theme.border,
                        })}
                      >
                        <BodyStrong style={{ flex: 1, fontSize: 15 }}>{f.name}</BodyStrong>
                        {borrowedBy === f.id && <Check size={16} color={theme.primary} />}
                      </Pressable>
                    ))}
                    {borrowedBy && (
                      <Pressable
                        onPress={() => { setBorrowedBy(""); setFriendPickerOpen(false); }}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 16,
                          paddingVertical: 13,
                          borderTopWidth: 1,
                          borderTopColor: theme.border,
                          backgroundColor: pressed ? theme.destructive + "12" : "transparent",
                        })}
                      >
                        <Caption style={{ color: theme.mutedForeground }}>Don't lend out</Caption>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
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

          {/* Condition */}
          <View className="gap-2">
            <Label className="font-semibold">Condition (Optional)</Label>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["fair", "good", "perfect"] as const).map((c) => {
                const color = c === "fair" ? "#F59E0B" : c === "good" ? "#10B981" : "#3B82F6";
                const selected = condition === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCondition(selected ? "" : c)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: selected ? color + "22" : (isDark ? theme.muted : "#F3F4F6"),
                      borderWidth: 1.5,
                      borderColor: selected ? color : "transparent",
                    }}
                  >
                    <Caption style={{ color: selected ? color : theme.mutedForeground, fontWeight: selected ? "600" : "400"}}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </Caption>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Max Borrow Duration */}
          <View className="gap-2">
            <Label nativeID="maxBorrowDuration" className="font-semibold">
              Max Borrow Duration (Optional)
            </Label>
            <Input
              value={maxBorrowDuration}
              onChangeText={setMaxBorrowDuration}
              placeholder="e.g. 1 week, 2 weeks, 1 month…"
              editable={!loading}
            />
          </View>
        </View>
      </ScrollView>

      {/* Sticky action buttons */}
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          padding: 16,
          paddingBottom: 24,
          backgroundColor: isDark ? theme.muted : "#F3F4F6",
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}
      >
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
          className="flex-1"
        >
          <Text>{loading ? "Updating…" : `Update ${categoryLabel}`}</Text>
        </Button>
      </View>
    </View>
  );
}
