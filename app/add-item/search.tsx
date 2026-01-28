import { useState } from "react";
import { useRouter } from "expo-router";
import {
  ScrollView,
  View,
  Image,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Label } from "@/components/ui/label";
import { Card, CardHeader } from "@/components/ui/card";
import { Book, Search } from "lucide-react-native";
import { FloatingBackButton } from "components/FloatingBackButton";
import { searchBooks } from "lib/hardcover-api";
import { SafeAreaWrapper } from "@/components/SafeAreaWrapper";

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

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<HardcoverBook[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSearchHardcover = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      setErrors({});

      // Use Hardcover API helper to search for books
      const apiToken = process.env.EXPO_PUBLIC_HARDCOVER_API_TOKEN || "";
      const results = await searchBooks(searchQuery, apiToken);

      console.log("📖 Search results count:", results.length);
      if (results.length > 0) {
        console.log("📖 First result sample:", results[0]);
      }

      // Transform Hardcover results to our format
      const books: HardcoverBook[] = results.map((entry: any) => {
        const book = entry.document;
        // Extract ISBN
        const isbn = book.isbn_13 || book.isbn_10 || undefined;

        // Get publication year from release_date
        const publicationYear = book.release_date
          ? new Date(book.release_date).getFullYear()
          : undefined;

        // Get genres from cached_tags (user-generated tags)
        const genres = book.genres || [];

        // Get author - try multiple possible fields
        let author: string[] = [];
        book.contributions.map((contribution: any) => {
          if (
            !contribution.contribution &&
            contribution.author &&
            contribution.author.name
          ) {
            author.push(contribution.author.name);
          }
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
          isbn,
          pageCount: book.pages || undefined,
          publicationYear,
          averageRating: book.rating || undefined,
        };
      });

      setSearchResults(books);

      if (books.length === 0) {
        setErrors({
          general: "No books found. Try a different search or enter manually.",
        });
      }
    } catch (error) {
      console.error("Book search error:", error);
      setErrors({
        general:
          "Failed to search for books. Please try again or fill in manually.",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSelectBook = (book: HardcoverBook) => {
    console.log("handleSelectBook:", book);
    // Navigate to book form with pre-filled data
    const params = new URLSearchParams({
      title: book.title,
      author: book.author.join(", "),
      ...(book.seriesName && { seriesName: book.seriesName }),
      ...(book.seriesNumber && { seriesNumber: book.seriesNumber }),
      ...(book.seriesId && { seriesId: book.seriesId.toString() }),
      ...(book.coverUrl && { coverUrl: book.coverUrl }),
      ...(book.genre && {
        genre: Array.isArray(book.genre) ? book.genre.join(", ") : book.genre,
      }),
      ...(book.description && { description: book.description }),
      ...(book.isbn && { isbn: book.isbn }),
      ...(book.pageCount && { pageCount: book.pageCount.toString() }),
      ...(book.publicationYear && {
        publicationYear: book.publicationYear.toString(),
      }),
      ...(book.averageRating && {
        averageRating: book.averageRating.toString(),
      }),
      ...(book.id && { hardcoverId: book.id }),
    });

    router.push(`/add-item/book?${params.toString()}` as any);
  };

  const handleManualEntry = () => {
    router.push("/add-item/book" as any);
  };

  return (
    <SafeAreaWrapper>
      <FloatingBackButton />

      <ScrollView
        className="flex-1 bg-background"
        keyboardShouldPersistTaps="handled"
      >
        <View className="p-4 gap-4">
          {errors.general && (
            <View className="p-3 bg-red-50 rounded-lg border border-red-200">
              <Text variant="small" className="text-red-600">
                {errors.general}
              </Text>
            </View>
          )}

          {/* Search Section */}
          <View className="gap-3">
            <View className="gap-2 items-center">
              <Label className="text-xl font-semibold  px-8">
                Search for a Book
              </Label>
              <Text variant="muted">
                Search Hardcover to auto-fill book details
              </Text>
            </View>

            <View className="flex-row gap-2">
              <Input
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Enter book title or author..."
                onSubmitEditing={handleSearchHardcover}
                className="flex-1"
                autoFocus
              />
              <Button
                onPress={handleSearchHardcover}
                disabled={!searchQuery.trim() || searching}
                className="bg-blue-600"
              >
                {searching ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Search size={16} color="white" />
                    <Text className="text-white">Search</Text>
                  </>
                )}
              </Button>
            </View>

            {searchResults.length > 0 && (
              <View className="gap-2">
                <Text variant="large" className="font-semibold">
                  Search Results ({searchResults.length})
                </Text>
                {searchResults.map((book, index) => {
                  console.log("Rendering book item:", book.title);
                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.7}
                      onPress={() => {
                        console.log("Touch detected for book:", book.title);
                        handleSelectBook(book);
                      }}
                      style={{ marginBottom: 8 }}
                    >
                      <Card pointerEvents="none">
                        <CardHeader pointerEvents="none">
                          <View className="flex-row gap-3 items-center">
                          <View className="w-[50px] h-[75px] rounded overflow-hidden items-center justify-center bg-muted">
                            {book.coverUrl ? (
                              <Image
                                source={{ uri: book.coverUrl }}
                                style={{ width: 50, height: 75 }}
                                resizeMode="cover"
                              />
                            ) : (
                              <Book size={24} color="#9ca3af" />
                            )}
                          </View>
                          <View className="flex-1 gap-1">
                            <Text variant="large" className="font-semibold">
                              {book.title}
                            </Text>
                            <Text variant="muted">
                              {book.author.join(", ")}
                            </Text>
                            {book.seriesName && (
                              <Text variant="small" className="text-blue-600">
                                {book.seriesName}{" "}
                                {book.seriesNumber && `#${book.seriesNumber}`}
                              </Text>
                            )}
                            {book.averageRating && (
                              <View className="flex-row items-center gap-1">
                                <Text
                                  variant="small"
                                  className="text-yellow-600"
                                >
                                  ★ {book.averageRating.toFixed(1)}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </CardHeader>
                    </Card>
                  </TouchableOpacity>
                );
                })}
              </View>
            )}

            {/* Manual Entry Option */}
            <View className="pt-2">
              <Button variant="outline" size="sm" onPress={handleManualEntry}>
                <Text>Can't find it? Enter manually</Text>
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
