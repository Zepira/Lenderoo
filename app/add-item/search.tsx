import { useState } from "react";
import { useRouter } from "expo-router";
import {
  ScrollView,
  View,
  Image,
  ActivityIndicator,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Search, BookOpen } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import {
  PageTitle,
  TinyLabel,
  BodyStrong,
  Caption,
  LabelStrong,
} from "@/components/ui/typography";
import { searchBooks } from "lib/hardcover-api";

interface HardcoverBook {
  id: string;
  title: string;
  author: string[];
  coverUrl?: string;
  seriesId?: number;
  seriesNumber?: string;
  seriesName?: string;
  genre?: string[];
  description?: string;
  isbn?: string;
  pageCount?: number;
  publicationYear?: number;
  averageRating?: number;
}

export default function SearchBookScreen() {
  const router = useRouter();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<HardcoverBook[]>([]);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setSearching(true);
      setError("");
      const apiToken = process.env.EXPO_PUBLIC_HARDCOVER_API_TOKEN || "";
      const results = await searchBooks(searchQuery, apiToken);

      const books: HardcoverBook[] = results.map((entry: any) => {
        const book = entry.document;
        const publicationYear = book.release_date
          ? new Date(book.release_date).getFullYear()
          : undefined;
        const genres = book.genres || [];
        let author: string[] = [];
        book.contributions.map((c: any) => {
          if (!c.contribution && c.author?.name) author.push(c.author.name);
        });
        return {
          id: book.id?.toString() || "",
          title: book.title || "",
          author,
          coverUrl: book.image?.url || book.cover_image_url,
          seriesName: book.featured_series?.series?.name || undefined,
          seriesId: book.featured_series?.series?.id || undefined,
          seriesNumber: book.featured_series_position || undefined,
          genre: genres,
          description: book.description || undefined,
          isbn: book.isbn_13 || book.isbn_10 || undefined,
          pageCount: book.pages || undefined,
          publicationYear,
          averageRating: book.rating || undefined,
        };
      });

      setSearchResults(books);
      if (books.length === 0) {
        setError("No books found. Try a different search or enter manually.");
      }
    } catch {
      setError("Failed to search. Please try again or enter manually.");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectBook = (book: HardcoverBook) => {
    const params = new URLSearchParams({
      title: book.title,
      author: book.author.join(", "),
      ...(book.seriesName && { seriesName: book.seriesName }),
      ...(book.seriesNumber && { seriesNumber: book.seriesNumber }),
      ...(book.seriesId && { seriesId: book.seriesId.toString() }),
      ...(book.coverUrl && { coverUrl: book.coverUrl }),
      ...(book.genre && { genre: Array.isArray(book.genre) ? book.genre.join(", ") : book.genre }),
      ...(book.description && { description: book.description }),
      ...(book.isbn && { isbn: book.isbn }),
      ...(book.pageCount && { pageCount: book.pageCount.toString() }),
      ...(book.publicationYear && { publicationYear: book.publicationYear.toString() }),
      ...(book.averageRating && { averageRating: book.averageRating.toString() }),
      ...(book.id && { hardcoverId: book.id }),
    });
    router.push(`/add-item/book?${params.toString()}` as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: theme.card,
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 4,
          marginBottom: 24,
        }}
      >
        <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: isDark ? theme.muted : "#F3F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <ArrowLeft size={22} color={theme.mutedForeground} />
              </Pressable>
              <PageTitle>Add a Book</PageTitle>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48, gap: 16 }}
      >
        {/* Search card */}
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
            <TinyLabel>Search Hardcover</TinyLabel>
            <Caption>Find your book to auto-fill all details</Caption>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: isDark ? theme.muted : "#F3F4F6",
              borderRadius: 16,
              paddingHorizontal: 14,
              gap: 10,
            }}
          >
            <Search size={18} color={theme.mutedForeground} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              placeholder="Title or author…"
              placeholderTextColor={theme.mutedForeground}
              returnKeyType="search"
              autoFocus
              style={{
                flex: 1,
                paddingVertical: 14,
                fontSize: 15,
                color: theme.foreground,
              }}
            />
          </View>

          <Button
            onPress={handleSearch}
            disabled={!searchQuery.trim() || searching}
          >
            {searching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white font-bold">Search</Text>
            )}
          </Button>

          {error ? (
            <View
              style={{
                backgroundColor: theme.destructive + "18",
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.destructive + "33",
              }}
            >
              <Caption style={{ color: theme.destructive }}>{error}</Caption>
            </View>
          ) : null}
        </View>

        {/* Results */}
        {searchResults.length > 0 && (
          <View style={{ gap: 10 }}>
            <TinyLabel style={{ paddingHorizontal: 4 }}>
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
            </TinyLabel>
            {searchResults.map((book, i) => (
              <Pressable
                key={i}
                onPress={() => handleSelectBook(book)}
                style={({ pressed }) => ({
                  backgroundColor: theme.card,
                  borderRadius: 24,
                  padding: 16,
                  flexDirection: "row",
                  gap: 14,
                  borderWidth: 1,
                  borderColor: theme.border,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                {/* Cover */}
                <View
                  style={{
                    width: 54,
                    height: 78,
                    borderRadius: 10,
                    overflow: "hidden",
                    backgroundColor: THEME.light.primary + "18",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {book.coverUrl ? (
                    <Image
                      source={{ uri: book.coverUrl }}
                      style={{ width: 54, height: 78 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <BookOpen size={24} color={THEME.light.primary} />
                  )}
                </View>

                {/* Info */}
                <View style={{ flex: 1, justifyContent: "center", gap: 4 }}>
                  <BodyStrong numberOfLines={2}>{book.title}</BodyStrong>
                  {book.author.length > 0 && (
                    <Caption numberOfLines={1}>{book.author.join(", ")}</Caption>
                  )}
                  {book.seriesName && (
                    <LabelStrong style={{ color: THEME.light.primary, fontSize: 11 }} numberOfLines={1}>
                      {book.seriesName}{book.seriesNumber ? ` #${book.seriesNumber}` : ""}
                    </LabelStrong>
                  )}
                  {book.averageRating && (
                    <Caption>★ {book.averageRating.toFixed(1)}</Caption>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Manual entry */}
        <Pressable
          onPress={() => router.push("/add-item/book" as any)}
          style={({ pressed }) => ({
            alignItems: "center",
            paddingVertical: 16,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Caption style={{ textDecorationLine: "underline" }}>
            Can't find it? Enter manually
          </Caption>
        </Pressable>
      </ScrollView>
    </View>
  );
}
