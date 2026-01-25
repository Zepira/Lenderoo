import { useState } from "react";
import { useRouter } from "expo-router";
import {
  ScrollView,
  View,
  Image,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Label } from "@/components/ui/label";
import { Card, CardHeader } from "@/components/ui/card";
import { Search, X } from "lucide-react-native";
import { useFriends, useCreateItem } from "hooks";
import { createItemSchema } from "lib/validation";
import { FloatingBackButton } from "components/FloatingBackButton";
import type { BookMetadata } from "lib/types";
import { cn } from "lib/utils";

interface GoodreadsBook {
  title: string;
  author: string;
  coverUrl?: string;
  series?: string;
  seriesNumber?: string;
  genre?: string[];
  goodreadsUrl?: string;
  description?: string;
}

export default function AddBookScreen() {
  const router = useRouter();
  const { friends } = useFriends();
  const { createItem, loading: saving } = useCreateItem();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GoodreadsBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<GoodreadsBook | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [series, setSeries] = useState("");
  const [seriesNumber, setSeriesNumber] = useState("");
  const [genre, setGenre] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [description, setDescription] = useState("");
  const [borrowedBy, setBorrowedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [goodreadsUrl, setGoodreadsUrl] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSearchGoodreads = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      setErrors({});

      // Use Open Library API to search for books
      const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(
        searchQuery
      )}&limit=5`;

      const response = await fetch(searchUrl);

      if (!response.ok) {
        throw new Error("Failed to search Open Library");
      }

      const data = await response.json();

      // Transform Open Library results to our format
      const books: GoodreadsBook[] = (data.docs || [])
        .slice(0, 5)
        .map((doc: any) => ({
          title: doc.title,
          author: doc.author_name?.[0] || "Unknown Author",
          coverUrl: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
            : undefined,
          series: doc.series?.[0],
          genre: doc.subject?.slice(0, 3),
          goodreadsUrl: undefined,
          description: doc.first_sentence?.[0] || undefined,
        }));

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

  const handleSelectBook = async (book: GoodreadsBook) => {
    setSelectedBook(book);
    setTitle(book.title);
    setAuthor(book.author);
    setSeries(book.series || "");
    setSeriesNumber(book.seriesNumber || "");
    setGenre(
      Array.isArray(book.genre) ? book.genre.join(", ") : book.genre || ""
    );
    setCoverUrl(book.coverUrl || "");
    setDescription(book.description || "");
    setGoodreadsUrl(book.goodreadsUrl || "");
    setSearchResults([]);
  };

  const handleManualEntry = () => {
    setSearchResults([]);
    setTitle(searchQuery);
  };

  const handleSubmit = async () => {
    try {
      setErrors({});

      const metadata: BookMetadata = {
        author: author.trim() || undefined,
        series: series.trim() || undefined,
        seriesNumber: seriesNumber.trim() || undefined,
        genre: genre.trim() || undefined,
        goodreadsUrl: goodreadsUrl.trim() || undefined,
      };

      const itemData = {
        name: title.trim(),
        description: description.trim() || undefined,
        category: "book" as const,
        imageUrl: coverUrl.trim() || undefined,
        borrowedBy: borrowedBy || undefined,
        borrowedDate: borrowedBy ? new Date() : undefined,
        notes: notes.trim() || undefined,
        metadata,
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
        console.error("Failed to create book:", error);
        setErrors({ general: "Failed to add book. Please try again." });
      }
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const selectedFriend = friends.find((f) => f.id === borrowedBy);

  const handleSelectFriend = () => {
    if (friends.length === 0) return;

    Alert.alert(
      "Select Friend",
      "Choose who to lend this book to",
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
    <View className="flex-1 bg-background">
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

          {/* Search Section */}
          {!selectedBook && (
            <View className="gap-3">
              <View className="gap-2">
                <Label className="text-xl font-semibold">
                  Search for a Book
                </Label>
                <Text variant="muted">
                  Search Open Library to auto-fill book details
                </Text>
              </View>

              <View className="flex-row gap-2">
                <Input
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Enter book title or author..."
                  onSubmitEditing={handleSearchGoodreads}
                  className="flex-1"
                />
                <Button
                  onPress={handleSearchGoodreads}
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
                    Search Results
                  </Text>
                  {searchResults.map((book, index) => (
                    <Pressable
                      key={index}
                      onPress={() => handleSelectBook(book)}
                    >
                      <Card className="active:scale-95">
                        <CardHeader>
                          <View className="flex-row gap-3 items-center">
                            {book.coverUrl && (
                              <Image
                                source={{ uri: book.coverUrl }}
                                style={{ width: 50, height: 75 }}
                                resizeMode="cover"
                                className="rounded"
                              />
                            )}
                            <View className="flex-1 gap-1">
                              <Text variant="large" className="font-semibold">
                                {book.title}
                              </Text>
                              <Text variant="muted">{book.author}</Text>
                              {book.series && (
                                <Text variant="small" className="text-blue-600">
                                  {book.series}{" "}
                                  {book.seriesNumber && `#${book.seriesNumber}`}
                                </Text>
                              )}
                            </View>
                          </View>
                        </CardHeader>
                      </Card>
                    </Pressable>
                  ))}
                  <Button variant="outline" size="sm" onPress={handleManualEntry}>
                    <Text>Can't find it? Enter manually</Text>
                  </Button>
                </View>
              )}

              {searchQuery &&
                !searching &&
                searchResults.length === 0 &&
                !selectedBook && (
                  <Button variant="outline" onPress={handleManualEntry}>
                    <Text>Enter "{searchQuery}" manually</Text>
                  </Button>
                )}
            </View>
          )}

          {/* Form Section - shown after search or manual entry */}
          {(selectedBook || title) && (
            <>
              {selectedBook && (
                <View className="flex-row justify-between items-center p-3 bg-green-50 rounded-lg">
                  <Text variant="small" className="text-green-600">
                    ✓ Book details loaded from Open Library
                  </Text>
                  <Pressable
                    onPress={() => {
                      setSelectedBook(null);
                      setTitle("");
                      setAuthor("");
                      setSeries("");
                      setSeriesNumber("");
                      setGenre("");
                      setCoverUrl("");
                      setDescription("");
                      setGoodreadsUrl("");
                    }}
                    className="p-1"
                  >
                    <X size={18} color="#9ca3af" />
                  </Pressable>
                </View>
              )}

              {/* Cover Preview */}
              {coverUrl && (
                <View className="items-center gap-2">
                  <Image
                    source={{ uri: coverUrl }}
                    style={{ width: 150, height: 225 }}
                    resizeMode="cover"
                    className="rounded-lg"
                  />
                </View>
              )}

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
                  <Label nativeID="series" className="font-semibold">
                    Series
                  </Label>
                  <Input
                    value={series}
                    onChangeText={setSeries}
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
                    placeholder="1"
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

              {/* Description */}
              <View className="gap-2">
                <Label nativeID="description" className="font-semibold">
                  Description
                </Label>
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Book description or synopsis"
                  multiline
                  numberOfLines={3}
                />
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
                      You haven't added any friends yet. You can add this book
                      to your library now and lend it out later.
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
                      disabled={saving}
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
                  disabled={saving}
                  className="flex-1"
                >
                  <Text>Cancel</Text>
                </Button>
                <Button
                  onPress={handleSubmit}
                  disabled={saving || !title.trim()}
                  className="flex-1 bg-blue-600"
                >
                  <Text className="text-white">
                    {saving
                      ? "Saving..."
                      : borrowedBy
                      ? "Add & Lend Book"
                      : "Add to Library"}
                  </Text>
                </Button>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
