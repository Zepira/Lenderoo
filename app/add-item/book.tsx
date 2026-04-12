import { useState, useRef, useEffect } from "react";
import { useRouter, useLocalSearchParams, useRootNavigation } from "expo-router";
import {
  ScrollView,
  View,
  Image,
  ActivityIndicator,
  Alert,
  Pressable,
  TextInput,
  Platform,
} from "react-native";
import { Camera, BookOpen } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { TinyLabel, BodyStrong, Caption } from "@/components/ui/typography";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useCreateItem, useItems } from "hooks";
import { createItemSchema } from "lib/validation";
import { supabase } from "@/lib/supabase";
import { ImagePicker } from "components/ImagePicker";
import type { BookMetadata } from "lib/types";

export default function AddBookScreen() {
  const router = useRouter();
  const rootNavigation = useRootNavigation();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

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

  const { createItem, loading: saving } = useCreateItem();
  const { items: existingItems } = useItems();
  const scrollViewRef = useRef<ScrollView>(null);
  const isSubmitting = useRef(false);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [seriesNumber, setSeriesNumber] = useState("");
  const [seriesName, setSeriesName] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [genre, setGenre] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [isbn, setIsbn] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [publicationYear, setPublicationYear] = useState("");
  const [averageRating, setAverageRating] = useState("");
  const [hardcoverId, setHardcoverId] = useState("");
  const [maxBorrowDuration, setMaxBorrowDuration] = useState("");
  const [condition, setCondition] = useState<"fair" | "good" | "perfect" | "">("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);

  useEffect(() => {
    if (params.title) setTitle(params.title);
    if (params.author) setAuthor(params.author);
    if (params.seriesName) setSeriesName(params.seriesName);
    if (params.seriesNumber) setSeriesNumber(params.seriesNumber);
    if (params.seriesId) setSeriesId(params.seriesId);
    if (params.genre) setGenre(params.genre);
    if (params.description) {
      setSynopsis(params.description);
    }
    if (params.coverUrl) setCoverUrl(params.coverUrl);
    if (params.isbn) setIsbn(params.isbn);
    if (params.pageCount) setPageCount(params.pageCount);
    if (params.publicationYear) setPublicationYear(params.publicationYear);
    if (params.averageRating) setAverageRating(params.averageRating);
    if (params.hardcoverId) setHardcoverId(params.hardcoverId);
  }, [params]);

  const handleSubmit = async () => {
    if (saving || isSubmitting.current || isLoading) return;
    isSubmitting.current = true;
    setIsLoading(true);

    try {
      setErrors({});

      if (!title.trim()) {
        setErrors({ name: "Title is required" });
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        if (Platform.OS !== "web")
          Alert.alert("Missing Information", "Please enter a book title.");
        isSubmitting.current = false;
        setIsLoading(false);
        return;
      }

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

      const duplicates = existingItems.filter((item) => {
        if (item.category !== "book") return false;
        if (item.name.toLowerCase().trim() !== title.toLowerCase().trim())
          return false;
        if (author.trim() && item.metadata) {
          const itemAuthor = (item.metadata as BookMetadata).author
            ?.toLowerCase()
            .trim();
          if (itemAuthor && itemAuthor !== author.toLowerCase().trim())
            return false;
        }
        return true;
      });

      if (duplicates.length > 0) {
        const dup = duplicates[0];
        const dupAuthor = (dup.metadata as BookMetadata)?.author;
        const msg = `"${dup.name}"${dupAuthor ? ` by ${dupAuthor}` : ""} is already in your library.`;
        if (Platform.OS !== "web")
          Alert.alert("Duplicate Book", msg, [{ text: "OK" }]);
        setErrors({ name: "This book is already in your library" });
        isSubmitting.current = false;
        setIsLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imageUrl: string | undefined;
      const trimmedCoverUrl = coverUrl.trim();
      if (trimmedCoverUrl) {
        const isExternal =
          trimmedCoverUrl.startsWith("http://") ||
          trimmedCoverUrl.startsWith("https://");
        const isSupabase = trimmedCoverUrl.includes("supabase.co/storage");
        if (isExternal && !isSupabase) {
          imageUrl = trimmedCoverUrl;
        } else if (!isExternal) {
          try {
            const { uploadItemImage } = await import("@/lib/storage-service");
            imageUrl = await uploadItemImage(trimmedCoverUrl, user.id);
          } catch {
            // Continue without image
          }
        } else {
          imageUrl = trimmedCoverUrl;
        }
      }

      const itemData = {
        name: title.trim(),
        description: description.trim() || undefined,
        category: "book" as const,
        images: imageUrl ? [imageUrl] : undefined,
        notes: notes.trim() || undefined,
        metadata,
      };

      createItemSchema.parse(itemData);
      const result = await createItem({ ...itemData, userId: user.id });
      if (!result) throw new Error("Failed to create item");
      router.replace("/(tabs)/library");
    } catch (error) {
      isSubmitting.current = false;
      setIsLoading(false);
      if (error && typeof error === "object" && "issues" in error) {
        const zodError = error as {
          issues: Array<{ path: Array<string | number>; message: string }>;
        };
        const fieldErrors: Record<string, string> = {};
        zodError.issues.forEach((err) => {
          if (err.path.length > 0)
            fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
      } else if (error instanceof Error) {
        setErrors({ general: error.message });
        if (Platform.OS !== "web") Alert.alert("Error", error.message);
      }
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

  const fromSearch = !!params.title;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? theme.muted : "#F3F4F6",
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        overflow: "hidden",
      }}
    >
      <ScreenHeader
        title={fromSearch ? title || "Book Details" : "Add a Book"}
        subtitle={undefined}
        onBack={() => router.back()}
        onDismiss={() => rootNavigation?.goBack()}
        icon={{ Icon: BookOpen, color: "#3B82F6" }}
      />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 48,
          gap: 16,
        }}
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
            <Caption style={{ color: theme.destructive }}>
              {errors.general}
            </Caption>
          </View>
        )}

        {/* Cover + core details */}
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
          {/* Cover image */}
          {coverUrl ? (
            <View style={{ alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 120,
                  height: 170,
                  borderRadius: 16,
                  overflow: "hidden",
                  backgroundColor: theme.muted,
                }}
              >
                <Image
                  source={{ uri: coverUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </View>
              <Pressable onPress={() => setShowImagePicker(true)}>
                <Caption
                  style={{
                    textDecorationLine: "underline",
                    color: theme.primary,
                  }}
                >
                  Change cover
                </Caption>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowImagePicker(true)}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <View
                style={{
                  borderWidth: 2,
                  borderStyle: "dashed",
                  borderColor: theme.border,
                  borderRadius: 20,
                  paddingVertical: 32,
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: "transparent",
                }}
              >
                <Camera size={32} color={theme.mutedForeground} />
                <TinyLabel>Add Cover Photo</TinyLabel>
              </View>
            </Pressable>
          )}

          {showImagePicker && (
            <ImagePicker
              autoOpen={!coverUrl}
              imageUrl={coverUrl}
              onImageSelected={(uri) => {
                setCoverUrl(uri);
                setShowImagePicker(false);
              }}
              onImageRemoved={() => {
                setCoverUrl("");
                setShowImagePicker(false);
              }}
            />
          )}

          {/* Title */}
          <View style={{ gap: 8 }}>
            <TinyLabel>Book Title *</TinyLabel>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. The Great Gatsby"
              placeholderTextColor={theme.mutedForeground}
              style={[
                inputStyle,
                errors.name
                  ? { borderWidth: 1.5, borderColor: theme.destructive }
                  : {},
              ]}
            />
            {errors.name && (
              <Caption style={{ color: theme.destructive }}>
                {errors.name}
              </Caption>
            )}
          </View>

          {/* Author */}
          <View style={{ gap: 8 }}>
            <TinyLabel>Author</TinyLabel>
            <TextInput
              value={author}
              onChangeText={setAuthor}
              placeholder="e.g. F. Scott Fitzgerald"
              placeholderTextColor={theme.mutedForeground}
              style={inputStyle}
            />
          </View>
        </View>

        {/* Series + metadata */}
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
          <TinyLabel>Series & Details</TinyLabel>

          {/* Series */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 2, gap: 8 }}>
              <TinyLabel>Series Name</TinyLabel>
              <TextInput
                value={seriesName}
                onChangeText={setSeriesName}
                placeholder="e.g. Harry Potter"
                placeholderTextColor={theme.mutedForeground}
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <TinyLabel>Book #</TinyLabel>
              <TextInput
                value={seriesNumber}
                onChangeText={setSeriesNumber}
                placeholder="1"
                keyboardType="numeric"
                placeholderTextColor={theme.mutedForeground}
                style={inputStyle}
              />
            </View>
          </View>

          {/* Genre */}
          <View style={{ gap: 8 }}>
            <TinyLabel>Genre</TinyLabel>
            <TextInput
              value={genre}
              onChangeText={setGenre}
              placeholder="Fantasy, Sci-Fi, etc."
              placeholderTextColor={theme.mutedForeground}
              style={inputStyle}
            />
          </View>

          {/* Publication year + pages */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <TinyLabel>Year</TinyLabel>
              <TextInput
                value={publicationYear}
                onChangeText={setPublicationYear}
                placeholder="2024"
                keyboardType="numeric"
                placeholderTextColor={theme.mutedForeground}
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <TinyLabel>Pages</TinyLabel>
              <TextInput
                value={pageCount}
                onChangeText={setPageCount}
                placeholder="320"
                keyboardType="numeric"
                placeholderTextColor={theme.mutedForeground}
                style={inputStyle}
              />
            </View>
          </View>
        </View>

        {/* Synopsis + notes */}
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
          <TinyLabel>Description & Notes</TinyLabel>

          <View style={{ gap: 8 }}>
            <TinyLabel>Synopsis</TinyLabel>
            <TextInput
              value={synopsis}
              onChangeText={setSynopsis}
              placeholder="Tell your friends about this book…"
              placeholderTextColor={theme.mutedForeground}
              multiline
              numberOfLines={4}
              style={[
                inputStyle,
                { minHeight: 100, textAlignVertical: "top", paddingTop: 14 },
              ]}
            />
          </View>

          <View style={{ gap: 8 }}>
            <TinyLabel>Personal Notes</TinyLabel>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Condition, reminders, etc."
              placeholderTextColor={theme.mutedForeground}
              multiline
              numberOfLines={2}
              style={[
                inputStyle,
                { minHeight: 60, textAlignVertical: "top", paddingTop: 14 },
              ]}
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

        {/* Submit */}
        <Button
          onPress={handleSubmit}
          disabled={isLoading || !title.trim()}
          style={{ borderRadius: 24 } as any}
        >
          {isLoading && <ActivityIndicator size="small" color="#fff" />}
          <Text className="text-white font-bold">
            {isLoading ? "Adding…" : "Add to Library"}
          </Text>
        </Button>
      </ScrollView>
    </View>
  );
}
