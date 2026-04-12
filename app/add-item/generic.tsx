import { useState, useRef } from "react";
import { useRouter, useLocalSearchParams, useRootNavigation } from "expo-router";
import {
  ScrollView,
  View,
  Alert,
  ActivityIndicator,
  Pressable,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { Camera } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import {
  TinyLabel,
  Caption,
} from "@/components/ui/typography";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useCreateItem, useItems } from "hooks";
import { CATEGORY_CONFIG } from "@/lib/category-config";
import { createItemSchema } from "lib/validation";
import { ImagePicker } from "components/ImagePicker";
import { uploadItemImage, validateImage } from "@/lib/storage-service";
import { supabase } from "@/lib/supabase";
import * as toast from "@/lib/toast";
import type { ItemCategory } from "lib/types";

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  book: "Book",
  tool: "Tool",
  clothing: "Clothing",
  electronics: "Electronics",
  game: "Game",
  sports: "Sports",
  kitchen: "Kitchen",
  other: "Item",
};

const PLACEHOLDERS: Partial<Record<ItemCategory, string>> = {
  tool: "e.g. Power Drill",
  clothing: "e.g. Winter Jacket",
  electronics: "e.g. iPad",
  game: "e.g. Settlers of Catan",
  sports: "e.g. Tennis Racket",
  kitchen: "e.g. Stand Mixer",
};

export default function AddGenericItemScreen() {
  const { category: categoryParam } = useLocalSearchParams<{ category: string }>();
  const category = (categoryParam || "other") as ItemCategory;
  const router = useRouter();
  const rootNavigation = useRootNavigation();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  const { createItem, loading } = useCreateItem();
  const { items: existingItems } = useItems();
  const isSubmitting = useRef<boolean>(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [maxBorrowDuration, setMaxBorrowDuration] = useState("");
  const [condition, setCondition] = useState<"fair" | "good" | "perfect" | "">("");
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showImagePicker, setShowImagePicker] = useState(false);

  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other;
  const categoryLabel = CATEGORY_LABELS[category] ?? "Item";

  const handleSubmit = async () => {
    if (loading || uploading || isSubmitting.current) return;
    isSubmitting.current = true;

    try {
      setErrors({});
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const duplicates = existingItems.filter(
        (item) =>
          item.category === category &&
          item.name.toLowerCase().trim() === name.toLowerCase().trim()
      );

      if (duplicates.length > 0) {
        Alert.alert(
          "Duplicate Item",
          `"${duplicates[0].name}" is already in your library.`,
          [{ text: "OK" }]
        );
        setErrors({ name: "This item is already in your library" });
        setUploading(false);
        isSubmitting.current = false;
        return;
      }

      let uploadedImageUrl: string | undefined;
      if (imageUrl && !imageUrl.startsWith("http")) {
        try {
          await validateImage(imageUrl);
          uploadedImageUrl = await uploadItemImage(imageUrl, user.id);
        } catch (err: any) {
          toast.error(err.message || "Failed to upload image");
          setUploading(false);
          isSubmitting.current = false;
          return;
        }
      } else {
        uploadedImageUrl = imageUrl.trim() || undefined;
      }

      const itemData = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        images: uploadedImageUrl ? [uploadedImageUrl] : undefined,
        notes: notes.trim() || undefined,
        metadata: (maxBorrowDuration.trim() || condition)
          ? { maxBorrowDuration: maxBorrowDuration.trim() || undefined, condition: condition || undefined }
          : undefined,
      };

      createItemSchema.parse(itemData);
      await createItem({ ...itemData, userId: user.id });
      toast.success("Item added successfully!");
      router.replace("/(tabs)/library");
    } catch (error) {
      isSubmitting.current = false;
      if (error && typeof error === "object" && "issues" in error) {
        const zodError = error as { issues: Array<{ path: Array<string | number>; message: string }> };
        const fieldErrors: Record<string, string> = {};
        zodError.issues.forEach((err) => {
          if (err.path.length > 0) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
        toast.error("Please fix the errors");
      } else {
        const msg = error instanceof Error ? error.message : "Failed to add item. Please try again.";
        setErrors({ general: msg });
        toast.error(msg);
      }
    } finally {
      setUploading(false);
      isSubmitting.current = false;
    }
  };

  const inputStyle = {
    backgroundColor: isDark ? theme.muted : "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.foreground,
    fontFamily: "Inter-Medium",
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6", borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: "hidden" }}>
      <ScreenHeader
        title={`Add ${categoryLabel}`}
        onBack={() => router.back()}
        onDismiss={() => rootNavigation?.goBack()}
        icon={{ Icon: cfg.Icon, color: cfg.color }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48, gap: 16 }}
      >
        {errors.general && (
          <View
            style={{
              backgroundColor: theme.destructive + "18",
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: theme.destructive + "33",
            }}
          >
            <Caption style={{ color: theme.destructive }}>{errors.general}</Caption>
          </View>
        )}

        {/* Main form card */}
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 32,
            padding: 24,
            borderWidth: 1,
            borderColor: theme.border,
            gap: 20,
          }}
        >
          {/* Photo picker */}
          {showImagePicker ? (
            <ImagePicker
              autoOpen={!imageUrl}
              imageUrl={imageUrl}
              onImageSelected={(uri) => { setImageUrl(uri); setShowImagePicker(false); }}
              onImageRemoved={() => { setImageUrl(""); setShowImagePicker(false); }}
            />
          ) : (
            <Pressable
              onPress={() => setShowImagePicker(true)}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <View
                style={{
                  borderWidth: 2,
                  borderStyle: imageUrl ? "solid" : "dashed",
                  borderColor: imageUrl ? cfg.color + "60" : theme.border,
                  borderRadius: 20,
                  paddingVertical: imageUrl ? 12 : 28,
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: imageUrl ? cfg.color + "08" : "transparent",
                  overflow: "hidden",
                }}
              >
                {imageUrl ? (
                  <View style={{ alignItems: "center", gap: 8 }}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={{ width: 90, height: 120, borderRadius: 10 }}
                      contentFit="cover"
                      cachePolicy="memory"
                    />
                    <Caption style={{ color: cfg.color }}>Tap to change photo</Caption>
                  </View>
                ) : (
                  <>
                    <Camera size={28} color={theme.mutedForeground} />
                    <TinyLabel>Add Photo (Optional)</TinyLabel>
                  </>
                )}
              </View>
            </Pressable>
          )}

          {/* Name */}
          <View style={{ gap: 8 }}>
            <TinyLabel>{categoryLabel} Name *</TinyLabel>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={PLACEHOLDERS[category] || `e.g. My ${categoryLabel}`}
              placeholderTextColor={theme.mutedForeground}
              autoFocus
              style={[
                inputStyle,
                errors.name ? { borderWidth: 1.5, borderColor: theme.destructive } : {},
              ]}
            />
            {errors.name && <Caption style={{ color: theme.destructive }}>{errors.name}</Caption>}
          </View>

          {/* Description */}
          <View style={{ gap: 8 }}>
            <TinyLabel>Description</TinyLabel>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Tell your friends about this item…"
              placeholderTextColor={theme.mutedForeground}
              multiline
              numberOfLines={3}
              style={[inputStyle, { minHeight: 90, textAlignVertical: "top", paddingTop: 14 }]}
            />
          </View>

          {/* Condition */}
          <View style={{ gap: 8 }}>
            <TinyLabel>Condition (Optional)</TinyLabel>
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

          {/* Max borrow duration */}
          <View style={{ gap: 8 }}>
            <TinyLabel>Max Borrow Duration (Optional)</TinyLabel>
            <TextInput
              value={maxBorrowDuration}
              onChangeText={setMaxBorrowDuration}
              placeholder="e.g. 1 week, 2 weeks, 1 month…"
              placeholderTextColor={theme.mutedForeground}
              style={inputStyle}
            />
          </View>
        </View>

        {/* Notes card */}
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 32,
            padding: 24,
            borderWidth: 1,
            borderColor: theme.border,
            gap: 12,
          }}
        >
          <TinyLabel>Notes</TinyLabel>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Condition, reminders, etc."
            placeholderTextColor={theme.mutedForeground}
            multiline
            numberOfLines={2}
            style={[inputStyle, { minHeight: 60, textAlignVertical: "top", paddingTop: 14 }]}
          />
        </View>

        {/* Submit */}
        <Button
          onPress={handleSubmit}
          disabled={loading || uploading || !name.trim()}
          style={{ borderRadius: 24 } as any}
        >
          {(uploading || loading) && <ActivityIndicator size="small" color="#fff" />}
          <Text className="text-white font-bold">
            {uploading ? "Uploading…" : loading ? "Saving…" : "Add to Library"}
          </Text>
        </Button>
      </ScrollView>
    </View>
  );
}
