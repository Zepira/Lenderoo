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
import { Camera, BookOpen, Library } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Checkbox } from "@/components/ui/checkbox";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { TinyLabel, BodyStrong, Caption } from "@/components/ui/typography";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useCreateItem, useItems } from "hooks";
import { createItemSchema } from "lib/validation";
import { supabase } from "@/lib/supabase";
import { ImagePicker } from "components/ImagePicker";
import type { BookMetadata } from "lib/types";
import { searchSeriesBooks, findSeriesId } from "@/lib/services/hardcover";

interface SeriesBook {
  hardcoverId: string;
  title: string;
  author: string;
  coverUrl?: string;
  seriesName: string;
  seriesId: number;
  seriesNumber?: string;
  genre: string;
  description?: string;
  isbn?: string;
  pageCount?: number;
  publicationYear?: number;
  averageRating?: number;
}

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

  const [seriesBooks, setSeriesBooks] = useState<SeriesBook[]>([]);
  const [loadingSeriesBooks, setLoadingSeriesBooks] = useState(false);
  const [showSeriesPicker, setShowSeriesPicker] = useState(false);
  const [selectedSeriesBookIds, setSelectedSeriesBookIds] = useState<Set<string>>(
    new Set(),
  );

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

  useEffect(() => {
    const trimmedSeriesName = seriesName.trim();
    if (!trimmedSeriesName) {
      setSeriesBooks([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingSeriesBooks(true);
      try {
        const parsedSeriesId = seriesId ? parseInt(seriesId, 10) : NaN;
        const resolved = !Number.isNaN(parsedSeriesId)
          ? { id: parsedSeriesId, name: trimmedSeriesName }
          : await findSeriesId(trimmedSeriesName);

        if (cancelled || !resolved) {
          if (!cancelled) setSeriesBooks([]);
          return;
        }

        const books = await searchSeriesBooks(resolved.name, resolved.id);
        if (cancelled) return;
        const others = books.filter(
          (b: SeriesBook) => b.hardcoverId !== hardcoverId,
        );
        setSeriesBooks(others);
        setSelectedSeriesBookIds(new Set());
      } catch {
        if (!cancelled) setSeriesBooks([]);
      } finally {
        if (!cancelled) setLoadingSeriesBooks(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [seriesName, seriesId, hardcoverId]);

  const findDuplicateItem = (bookTitle: string, bookAuthor: string) => {
    if (!bookTitle.trim()) return null;
    return (
      existingItems.find((item) => {
        if (item.category !== "book") return false;
        if (item.name.toLowerCase().trim() !== bookTitle.toLowerCase().trim())
          return false;
        if (bookAuthor.trim() && item.metadata) {
          const itemAuthor = (item.metadata as BookMetadata).author
            ?.toLowerCase()
            .trim();
          if (itemAuthor && itemAuthor !== bookAuthor.toLowerCase().trim())
            return false;
        }
        return true;
      }) || null
    );
  };

  const duplicateItem = title.trim() ? findDuplicateItem(title, author) : null;
  const duplicateWarning = duplicateItem
    ? `"${duplicateItem.name}"${
        (duplicateItem.metadata as BookMetadata)?.author
          ? ` by ${(duplicateItem.metadata as BookMetadata).author}`
          : ""
      } is already in your library.`
    : "";

  const toggleSeriesBook = (hardcoverId: string) => {
    setSelectedSeriesBookIds((prev) => {
      const next = new Set(prev);
      if (next.has(hardcoverId)) next.delete(hardcoverId);
      else next.add(hardcoverId);
      return next;
    });
  };

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

      const dup = findDuplicateItem(title, author);

      if (dup) {
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
            const { uploadItemImage } = await import("@/lib/services/storage");
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

      const booksToAdd = seriesBooks.filter((b) =>
        selectedSeriesBookIds.has(b.hardcoverId),
      );
      for (const book of booksToAdd) {
        const alreadyOwned = existingItems.some(
          (item) =>
            item.category === "book" &&
            item.name.toLowerCase().trim() === book.title.toLowerCase().trim(),
        );
        if (alreadyOwned) continue;

        const seriesBookMetadata: BookMetadata = {
          author: book.author || undefined,
          seriesName: book.seriesName,
          seriesNumber: book.seriesNumber || undefined,
          seriesId: book.seriesId,
          genre: book.genre || undefined,
          synopsis: book.description || undefined,
          isbn: book.isbn || undefined,
          pageCount: book.pageCount,
          publicationYear: book.publicationYear,
          averageRating: book.averageRating,
          hardcoverId: book.hardcoverId || undefined,
        };

        try {
          await createItem({
            name: book.title,
            category: "book",
            images: book.coverUrl ? [book.coverUrl] : undefined,
            metadata: seriesBookMetadata,
            userId: user.id,
          });
        } catch {
          // Skip books that fail to add; primary book is already saved.
        }
      }

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
        {duplicateWarning && (
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
              {duplicateWarning}
            </Caption>
          </View>
        )}

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

          {/* Series bulk-add */}
          {loadingSeriesBooks && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color={theme.mutedForeground} />
              <Caption>Checking for other books in this series…</Caption>
            </View>
          )}

          {!loadingSeriesBooks && seriesBooks.length > 0 && (
            <View style={{ gap: 12 }}>
              <Caption>
                This book is part of a series, would you like to add other the
                books in the series?
              </Caption>

              {!showSeriesPicker ? (
                <Button
                  variant="secondary"
                  onPress={() => {
                    setSelectedSeriesBookIds(
                      new Set(seriesBooks.map((b) => b.hardcoverId)),
                    );
                    setShowSeriesPicker(true);
                  }}
                >
                  <Library size={16} color={theme.secondaryForeground} />
                  <Text>Add more books in this series</Text>
                </Button>
              ) : (
                <View style={{ gap: 10 }}>
                  {seriesBooks.map((book) => {
                    const checked = selectedSeriesBookIds.has(book.hardcoverId);
                    return (
                      <Pressable
                        key={book.hardcoverId}
                        onPress={() => toggleSeriesBook(book.hardcoverId)}
                        style={({ pressed }) => ({
                          padding: 12,
                          borderRadius: 16,
                          backgroundColor: isDark ? theme.muted : "#F3F4F6",
                          opacity: pressed ? 0.75 : 1,
                          gap: 4,
                        })}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <Checkbox checked={checked} onCheckedChange={() => {}} />
                          <View
                            style={{
                              width: 32,
                              height: 46,
                              borderRadius: 6,
                              overflow: "hidden",
                              backgroundColor: theme.card,
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {book.coverUrl ? (
                              <Image
                                source={{ uri: book.coverUrl }}
                                style={{ width: 32, height: 46 }}
                                resizeMode="cover"
                              />
                            ) : (
                              <BookOpen size={16} color={theme.mutedForeground} />
                            )}
                          </View>
                          <BodyStrong style={{ flex: 1 }} numberOfLines={1}>
                            {book.title}
                          </BodyStrong>
                        </View>
                        <Caption style={{ marginLeft: 24 + 12 + 32 + 12 }} numberOfLines={1}>
                          {book.seriesNumber ? `Book ${book.seriesNumber}` : book.author}
                        </Caption>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}
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
          className="rounded-full"
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
