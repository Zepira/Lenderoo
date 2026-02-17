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
import { useFriends, useCreateItem, useItems } from "hooks";
import { createItemSchema } from "lib/validation";
import { FloatingBackButton } from "components/FloatingBackButton";
import { supabase } from "@/lib/supabase";
import { ImagePicker } from "components/ImagePicker";
import type { BookMetadata } from "lib/types";
import { cn } from "lib/utils";
import { SafeAreaWrapper } from "@/components/SafeAreaWrapper";
export default function AddBookScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    author?: string;
    seriesName?: string;
    seriesNumber?: string;
    seriesId?: string;
    genre?: string;
    description?: string;
    coverUrl?: string;
    isbn?: string;
    pageCount?: string;
    publicationYear?: string;
    averageRating?: string;
    hardcoverId?: string;
  }>();
  const { friends } = useFriends();
  const { createItem, loading: saving } = useCreateItem();
  const { items: existingItems } = useItems();
  const scrollViewRef = useRef<ScrollView>(null);
  const isSubmitting = useRef(false);

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

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Local loading state for immediate UI feedback
  const [isLoading, setIsLoading] = useState(false);

  // Pre-fill form from URL parameters
  useEffect(() => {
    if (params.title) setTitle(params.title);
    if (params.author) setAuthor(params.author);
    if (params.seriesName) setSeriesName(params.seriesName);
    if (params.seriesNumber) setSeriesNumber(params.seriesNumber);
    if (params.seriesId) setSeriesId(params.seriesId);
    if (params.genre) setGenre(params.genre);
    if (params.description) {
      setSynopsis(params.description);
      // Use first sentence as short description
      const shortDesc = params.description.split(".")[0] + ".";
      setDescription(shortDesc.length < 100 ? shortDesc : "");
    }
    if (params.coverUrl) setCoverUrl(params.coverUrl);
    if (params.isbn) setIsbn(params.isbn);
    if (params.pageCount) setPageCount(params.pageCount);
    if (params.publicationYear) setPublicationYear(params.publicationYear);
    if (params.averageRating) setAverageRating(params.averageRating);
    if (params.hardcoverId) setHardcoverId(params.hardcoverId);
  }, [params]);

  const handleSubmit = async () => {
    console.log("📝 Starting book submission...");

    // Prevent double submission
    if (saving || isSubmitting.current || isLoading) {
      console.log("⚠️ Already saving, ignoring duplicate submission");
      return;
    }

    isSubmitting.current = true;
    setIsLoading(true);

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
      };

      // Check for duplicates
      console.log("🔍 Checking for duplicates...");
      const duplicates = existingItems.filter((item) => {
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
        isSubmitting.current = false;
        setIsLoading(false);
        return;
      }

      console.log("📦 Building item data...");

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      // For external URLs (book covers), use them directly - no need to re-upload
      // Only upload if it's a local file URI (from image picker)
      let imageUrl: string | undefined;
      const trimmedCoverUrl = coverUrl.trim();

      if (trimmedCoverUrl) {
        const isExternalUrl = trimmedCoverUrl.startsWith('http://') ||
                             trimmedCoverUrl.startsWith('https://');
        const isSupabaseUrl = trimmedCoverUrl.includes('supabase.co/storage');

        if (isExternalUrl && !isSupabaseUrl) {
          // External URL (e.g., book cover API) - use directly
          console.log("🔗 Using external URL directly (no upload needed)");
          imageUrl = trimmedCoverUrl;
        } else if (!isExternalUrl) {
          // Local file - upload to storage
          try {
            console.log("📤 Uploading local image...");
            const { uploadItemImage } = await import("@/lib/storage-service");
            imageUrl = await uploadItemImage(trimmedCoverUrl, user.id);
            console.log("✅ Image uploaded:", imageUrl);
          } catch (error: any) {
            console.error("❌ Image upload failed:", error);
            console.warn("⚠️ Book will be added without cover image");
            // Continue without image
          }
        } else {
          // Already a Supabase URL
          imageUrl = trimmedCoverUrl;
        }
      }

      const itemData = {
        name: title.trim(),
        description: description.trim() || undefined,
        category: "book" as const,
        images: imageUrl ? [imageUrl] : undefined,
        borrowedBy: borrowedBy || undefined,
        borrowedDate: borrowedBy ? new Date() : undefined,
        notes: notes.trim() || undefined,
        metadata,
      };

      console.log("✅ Validating with schema...");
      createItemSchema.parse(itemData);

      console.log("💾 Creating item in database...");
      console.log("Item data:", JSON.stringify(itemData, null, 2));

      const result = await createItem({
        ...itemData,
        userId: user.id,
      });

      if (!result) {
        throw new Error(
          "Failed to create item - no result returned from database"
        );
      }

      console.log("✅ Book added successfully! ID:", result.id);

      router.back();
    } catch (error) {
      isSubmitting.current = false;
      setIsLoading(false);
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
    <SafeAreaWrapper>
      <FloatingBackButton />

      <ScrollView ref={scrollViewRef} className="flex-1 bg-background">
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
            <View className="gap-2 items-center">
              <Label className="text-xl font-semibold px-8">
                Add Book Details
              </Label>
              <Text variant="muted">Fill in the book information below</Text>
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

            {/* Action Buttons */}
            <View className="flex-row gap-3 pt-2">
              <Button
                variant="outline"
                onPress={handleCancel}
                disabled={isLoading}
                className="flex-1"
              >
                <Text>Cancel</Text>
              </Button>
              <Button
                onPress={handleSubmit}
                disabled={isLoading || !title.trim()}
                className="flex-1 bg-blue-600"
              >
                {isLoading && <ActivityIndicator size="small" color="white" />}
                <Text className="text-white">
                  {isLoading
                    ? "Saving..."
                    : borrowedBy
                    ? "Add & Lend Book"
                    : "Add to Library"}
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
