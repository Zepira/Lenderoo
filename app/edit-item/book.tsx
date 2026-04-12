import { useState, useRef, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ScrollView,
  View,
  Image,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Label } from "@/components/ui/label";
import { Card, CardHeader } from "@/components/ui/card";
import { Book } from "lucide-react-native";
import { useFriends, useUpdateItem, useItems } from "hooks";
import { createItemSchema } from "lib/validation";
import { ImagePicker } from "components/ImagePicker";
import type { BookMetadata } from "lib/types";
import { cn } from "lib/utils";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { Caption } from "@/components/ui/typography";

export default function EditBookScreen() {
  const router = useRouter();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;
  const params = useLocalSearchParams<{
    itemId: string;
    title?: string;
    author?: string;
    seriesName?: string;
    seriesNumber?: string;
    seriesId?: string;
    genre?: string;
    description?: string;
    synopsis?: string;
    coverUrl?: string;
    isbn?: string;
    pageCount?: string;
    publicationYear?: string;
    averageRating?: string;
    hardcoverId?: string;
    notes?: string;
    borrowedBy?: string;
    maxBorrowDuration?: string;
    condition?: string;
  }>();
  const { friends } = useFriends();
  const { updateItem, loading: saving } = useUpdateItem();
  const { items: existingItems } = useItems();
  const scrollViewRef = useRef<ScrollView>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [seriesNumber, setSeriesNumber] = useState("");
  const [seriesName, setSeriesName] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [genre, setGenre] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [description, setDescription] = useState("");
  const [borrowedBy, setBorrowedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [isbn, setIsbn] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [publicationYear, setPublicationYear] = useState("");
  const [averageRating, setAverageRating] = useState("");
  const [hardcoverId, setHardcoverId] = useState("");
  const [maxBorrowDuration, setMaxBorrowDuration] = useState("");
  const [condition, setCondition] = useState<"fair" | "good" | "perfect" | "">("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill form from URL parameters (only on mount)
  useEffect(() => {
    if (params.title) setTitle(params.title);
    if (params.author) setAuthor(params.author);
    if (params.seriesName) setSeriesName(params.seriesName);
    if (params.seriesNumber) setSeriesNumber(params.seriesNumber);
    if (params.seriesId) setSeriesId(params.seriesId);
    if (params.genre) setGenre(params.genre);
    if (params.synopsis) setSynopsis(params.synopsis);
    if (params.description) setDescription(params.description);
    if (params.coverUrl) setCoverUrl(params.coverUrl);
    if (params.isbn) setIsbn(params.isbn);
    if (params.pageCount) setPageCount(params.pageCount);
    if (params.publicationYear) setPublicationYear(params.publicationYear);
    if (params.averageRating) setAverageRating(params.averageRating);
    if (params.hardcoverId) setHardcoverId(params.hardcoverId);
    if (params.notes) setNotes(params.notes);
    if (params.borrowedBy) setBorrowedBy(params.borrowedBy);
    if (params.maxBorrowDuration) setMaxBorrowDuration(params.maxBorrowDuration);
    if (params.condition) setCondition(params.condition as "fair" | "good" | "perfect");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleSubmit = async () => {
    console.log("📝 Starting book submission...");

    // Prevent double submission
    if (saving) {
      console.log("⚠️ Already saving, ignoring duplicate submission");
      return;
    }

    try {
      setErrors({});

      // Validate required fields
      if (!title.trim()) {
        console.error("❌ Validation failed: Title is required");
        setErrors({ name: "Title is required" });
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        Alert.alert("Missing Information", "Please enter a book title.");
        return;
      }

      // Check for duplicates (excluding the current item being edited)
      console.log("🔍 Checking for duplicates...");
      const duplicates = existingItems.filter((item) => {
        // Skip the current item
        if (item.id === params.itemId) return false;

        if (item.category !== "book") return false;

        const itemTitle = item.name.toLowerCase().trim();
        const newTitle = title.toLowerCase().trim();

        // Check title match
        if (itemTitle !== newTitle) return false;

        // If we have author info, check that too
        if (author.trim() && item.metadata) {
          const itemAuthor = (item.metadata as BookMetadata).author
            ?.toLowerCase()
            .trim();
          const newAuthor = author.toLowerCase().trim();

          if (itemAuthor && itemAuthor !== newAuthor) return false;
        }

        return true;
      });

      if (duplicates.length > 0) {
        const duplicate = duplicates[0];
        const duplicateAuthor = (duplicate.metadata as BookMetadata)?.author;

        console.warn("⚠️ Duplicate book found:", duplicate.name);

        const duplicateMessage = `"${duplicate.name}"${
          duplicateAuthor ? ` by ${duplicateAuthor}` : ""
        } is already in your library.`;

        Alert.alert(
          "Duplicate Book",
          duplicateMessage,
          [{ text: "OK" }]
        );

        setErrors({ name: "This book is already in your library" });
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }

      console.log("📦 Building metadata...");
      const metadata: BookMetadata = {
        author: author.trim() || undefined,
        seriesName: seriesName.trim() || undefined,
        seriesNumber: seriesNumber || undefined,
        seriesId: seriesId ? parseInt(seriesId) : undefined,
        genre: genre.trim() || undefined,
        synopsis: synopsis.trim() || undefined,
        isbn: isbn.trim() || undefined,
        pageCount: pageCount ? parseInt(pageCount) : undefined,
        publicationYear: publicationYear
          ? parseInt(publicationYear)
          : undefined,
        averageRating: averageRating ? parseFloat(averageRating) : undefined,
        hardcoverId: hardcoverId || undefined,
        maxBorrowDuration: maxBorrowDuration.trim() || undefined,
        condition: condition || undefined,
      };

      console.log("📦 Building update data...");
      const updates = {
        name: title.trim(),
        description: description.trim() || undefined,
        imageUrl: coverUrl.trim() || undefined,
        borrowedBy: borrowedBy || undefined,
        notes: notes.trim() || undefined,
        metadata,
      };

      console.log("✅ Validating with schema...");
      createItemSchema.parse({
        ...updates,
        category: "book" as const,
        borrowedDate: borrowedBy ? new Date() : undefined,
      });

      console.log("💾 Updating item in database...");
      console.log("Update data:", JSON.stringify(updates, null, 2));

      const result = await updateItem(params.itemId!, updates);

      if (!result) {
        throw new Error(
          "Failed to update item - no result returned from database"
        );
      }

      console.log("✅ Book updated successfully! ID:", result.id);

      router.back();
    } catch (error) {
      console.error("❌ Error adding book:", error);

      // Handle Zod validation errors
      if (error && typeof error === "object" && "issues" in error) {
        const zodError = error as {
          issues: Array<{ path: Array<string | number>; message: string }>;
        };
        const fieldErrors: Record<string, string> = {};
        const errorMessages: string[] = [];

        zodError.issues.forEach((err) => {
          const fieldName = err.path[0] as string;
          const message = err.message;

          if (err.path.length > 0) {
            fieldErrors[fieldName] = message;
            errorMessages.push(`${fieldName}: ${message}`);
          }
          console.error(`  - ${fieldName}: ${message}`);
        });

        setErrors(fieldErrors);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });

        Alert.alert(
          "Validation Error",
          `Please fix the following issues:\n\n${errorMessages.join("\n")}`,
          [{ text: "OK" }]
        );
      } else if (error instanceof Error) {
        // Handle generic errors
        const errorMessage = error.message || "An unknown error occurred";
        console.error("Error details:", errorMessage);
        setErrors({ general: `Failed to add book: ${errorMessage}` });
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });

        Alert.alert(
          "Error",
          `Failed to add book. ${errorMessage}\n\nPlease try again.`,
          [{ text: "OK" }]
        );
      } else {
        // Handle unknown error types
        console.error("Unknown error type:", error);
        setErrors({
          general: "An unexpected error occurred. Please try again.",
        });
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });

        Alert.alert(
          "Error",
          "An unexpected error occurred while adding the book. Please try again.",
          [{ text: "OK" }]
        );
      }
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}>
      <ScreenHeader
        title={`Edit ${params.title || title || "Book"}`}
        onBack={() => router.back()}
        right={
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#3B82F611", alignItems: "center", justifyContent: "center" }}>
            <Book size={18} color="#3B82F6" />
          </View>
        }
      />

      <ScrollView ref={scrollViewRef} className="flex-1">
        <View className="p-4 gap-4">
          {errors.general && (
            <View className="p-3 bg-red-50 rounded-lg border border-red-200">
              <Text variant="small" className="text-red-600">
                {errors.general}
              </Text>
            </View>
          )}

          {/* Book Form */}
          <View className="gap-4">
            {/* Header */}
            <View className="gap-2">
              <Label className="text-xl font-semibold">Edit Book Details</Label>
              <Text variant="muted">Update the book information below</Text>
            </View>

            {/* Cover Image */}
            <View className="gap-2">
              <Label className="font-semibold">Cover Image (Optional)</Label>
              <ImagePicker
                imageUrl={coverUrl}
                onImageSelected={(uri) => setCoverUrl(uri)}
                onImageRemoved={() => setCoverUrl("")}
              />
              <Text variant="small" className="text-muted-foreground">
                Take a photo or choose from your library
              </Text>
            </View>

            {/* Cover URL Input - Manual fallback */}
            <View className="gap-2">
              <Label nativeID="coverUrl" className="font-semibold">
                Or enter image URL
              </Label>
              <Input
                value={coverUrl}
                onChangeText={setCoverUrl}
                placeholder="https://example.com/cover.jpg"
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            {/* Book Title */}
            <View className="gap-2">
              <Label nativeID="title" className="font-semibold">
                Title *
              </Label>
              <Input
                value={title}
                onChangeText={setTitle}
                placeholder="Book title"
                className={cn(errors.name && "border-red-500")}
              />
              {errors.name && (
                <Text variant="muted" className="text-red-600">
                  {errors.name}
                </Text>
              )}
            </View>

            {/* Author */}
            <View className="gap-2">
              <Label nativeID="author" className="font-semibold">
                Author
              </Label>
              <Input
                value={author}
                onChangeText={setAuthor}
                placeholder="Author name"
              />
            </View>

            {/* Series Info */}
            <View className="flex-row gap-3">
              <View className="flex-[2] gap-2">
                <Label nativeID="seriesName" className="font-semibold">
                  Series
                </Label>
                <Input
                  value={seriesName}
                  onChangeText={setSeriesName}
                  placeholder="Series name"
                />
              </View>
              <View className="flex-1 gap-2">
                <Label nativeID="seriesNumber" className="font-semibold">
                  Book #
                </Label>
                <Input
                  value={seriesNumber}
                  onChangeText={setSeriesNumber}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Genre */}
            <View className="gap-2">
              <Label nativeID="genre" className="font-semibold">
                Genre
              </Label>
              <Input
                value={genre}
                onChangeText={setGenre}
                placeholder="Fantasy, Science Fiction, etc."
              />
            </View>

            {/* Synopsis */}
            <View className="gap-2">
              <Label nativeID="synopsis" className="font-semibold">
                Synopsis
              </Label>
              <Textarea
                value={synopsis}
                onChangeText={setSynopsis}
                placeholder="Enter the book's synopsis or description"
                numberOfLines={4}
              />
            </View>

            {/* Notes */}
            <View className="gap-2">
              <Label nativeID="notes" className="font-semibold">
                Notes
              </Label>
              <Input
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional notes..."
                multiline
                numberOfLines={2}
              />
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
              />
            </View>
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
          disabled={saving}
          style={{ flex: 1 } as any}
        >
          <Text>Cancel</Text>
        </Button>
        <Button
          onPress={handleSubmit}
          disabled={saving || !title.trim()}
          style={{ flex: 1 } as any}
        >
          {saving && <ActivityIndicator size="small" color="#fff" />}
          <Text className="text-white font-bold">
            {saving ? "Updating…" : "Update Book"}
          </Text>
        </Button>
      </View>
    </View>
  );
}
