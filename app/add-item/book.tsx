import { useState } from "react";
import { Stack, useRouter } from "expo-router";
import {
  YStack,
  XStack,
  Text,
  Input,
  Button,
  ScrollView,
  Label,
  Image,
  Card,
  Spinner,
  Select,
  Adapt,
  Sheet,
} from "tamagui";
import { Check, ChevronDown, Search, X } from "@tamagui/lucide-icons";
import { Platform } from "react-native";
import { useFriends, useCreateItem } from "hooks";
import { createItemSchema } from "lib/validation";
import type { BookMetadata } from "lib/types";

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

  return (
    <>
      <Stack.Screen
        options={{
          title: "Add Book",
          presentation: "modal",
          headerLeft: () => (
            <Button chromeless onPress={handleCancel} disabled={saving}>
              Cancel
            </Button>
          ),
        }}
      />

      <ScrollView flex={1} bg="$background">
        <YStack p="$4" gap="$4">
          {errors.general && (
            <YStack
              p="$3"
              bg="$red2"
              rounded="$3"
              borderWidth={1}
              borderColor="$red7"
            >
              <Text color="$red11" fontSize="$3">
                {errors.general}
              </Text>
            </YStack>
          )}

          {/* Search Section */}
          {!selectedBook && (
            <YStack gap="$3">
              <YStack gap="$2">
                <Label fontSize="$5" fontWeight="600">
                  Search for a Book
                </Label>
                <Text fontSize="$3" color="$gray11">
                  Search Open Library to auto-fill book details
                </Text>
              </YStack>

              <XStack gap="$2">
                <Input
                  flex={1}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Enter book title or author..."
                  onSubmitEditing={handleSearchGoodreads}
                />
                <Button
                  icon={Search}
                  onPress={handleSearchGoodreads}
                  disabled={!searchQuery.trim() || searching}
                  bg="$blue10"
                  color="white"
                >
                  {searching ? (
                    <Spinner size="small" color="white" />
                  ) : (
                    "Search"
                  )}
                </Button>
              </XStack>

              {searchResults.length > 0 && (
                <YStack gap="$2">
                  <Text fontSize="$4" fontWeight="600">
                    Search Results
                  </Text>
                  {searchResults.map((book, index) => (
                    <Card
                      key={index}
                      elevate
                      bordered
                      pressStyle={{ scale: 0.98 }}
                      onPress={() => handleSelectBook(book)}
                      cursor="pointer"
                    >
                      <Card.Header padded>
                        <XStack gap="$3" items="center">
                          {book.coverUrl && (
                            <Image
                              source={{ uri: book.coverUrl }}
                              width={50}
                              height={75}
                              resizeMode="cover"
                              rounded="$2"
                            />
                          )}
                          <YStack flex={1} gap="$1">
                            <Text fontSize="$4" fontWeight="600">
                              {book.title}
                            </Text>
                            <Text fontSize="$3" color="$gray11">
                              {book.author}
                            </Text>
                            {book.series && (
                              <Text fontSize="$2" color="$blue10">
                                {book.series}{" "}
                                {book.seriesNumber && `#${book.seriesNumber}`}
                              </Text>
                            )}
                          </YStack>
                        </XStack>
                      </Card.Header>
                    </Card>
                  ))}
                  <Button
                    variant="outlined"
                    onPress={handleManualEntry}
                    size="$3"
                  >
                    Can't find it? Enter manually
                  </Button>
                </YStack>
              )}

              {searchQuery &&
                !searching &&
                searchResults.length === 0 &&
                !selectedBook && (
                  <Button variant="outlined" onPress={handleManualEntry}>
                    Enter "{searchQuery}" manually
                  </Button>
                )}
            </YStack>
          )}

          {/* Form Section - shown after search or manual entry */}
          {(selectedBook || title) && (
            <>
              {selectedBook && (
                <XStack
                  justify="space-between"
                  items="center"
                  p="$3"
                  bg="$green2"
                  rounded="$3"
                >
                  <Text fontSize="$3" color="$green11">
                    ✓ Book details loaded from Open Library
                  </Text>
                  <Button
                    size="$2"
                    chromeless
                    icon={X}
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
                  />
                </XStack>
              )}

              {/* Cover Preview */}
              {coverUrl && (
                <YStack items="center" gap="$2">
                  <Image
                    source={{ uri: coverUrl }}
                    width={150}
                    height={225}
                    resizeMode="cover"
                    rounded="$3"
                  />
                </YStack>
              )}

              {/* Book Title */}
              <YStack gap="$2">
                <Label htmlFor="title" fontSize="$4" fontWeight="600">
                  Title *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Book title"
                  borderColor={errors.name ? "$red7" : "$borderColor"}
                />
                {errors.name && (
                  <Text color="$red10" fontSize="$2">
                    {errors.name}
                  </Text>
                )}
              </YStack>

              {/* Author */}
              <YStack gap="$2">
                <Label htmlFor="author" fontSize="$4" fontWeight="600">
                  Author
                </Label>
                <Input
                  id="author"
                  value={author}
                  onChangeText={setAuthor}
                  placeholder="Author name"
                />
              </YStack>

              {/* Series Info */}
              <XStack gap="$3">
                <YStack flex={2} gap="$2">
                  <Label htmlFor="series" fontSize="$4" fontWeight="600">
                    Series
                  </Label>
                  <Input
                    id="series"
                    value={series}
                    onChangeText={setSeries}
                    placeholder="Series name"
                  />
                </YStack>
                <YStack flex={1} gap="$2">
                  <Label htmlFor="seriesNumber" fontSize="$4" fontWeight="600">
                    Book #
                  </Label>
                  <Input
                    id="seriesNumber"
                    value={seriesNumber}
                    onChangeText={setSeriesNumber}
                    placeholder="1"
                    keyboardType="numeric"
                  />
                </YStack>
              </XStack>

              {/* Genre */}
              <YStack gap="$2">
                <Label htmlFor="genre" fontSize="$4" fontWeight="600">
                  Genre
                </Label>
                <Input
                  id="genre"
                  value={genre}
                  onChangeText={setGenre}
                  placeholder="Fantasy, Science Fiction, etc."
                />
              </YStack>

              {/* Description */}
              <YStack gap="$2">
                <Label htmlFor="description" fontSize="$4" fontWeight="600">
                  Description
                </Label>
                <Input
                  id="description"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Book description or synopsis"
                  multiline
                  numberOfLines={3}
                />
              </YStack>

              {/* Friend Selector */}
              <YStack gap="$2">
                <Label htmlFor="borrowedBy" fontSize="$4" fontWeight="600">
                  Lending To (Optional)
                </Label>
                <Text fontSize="$3" color="$gray11">
                  Leave empty to add to your library without lending it out
                </Text>
                {friends.length === 0 ? (
                  <YStack gap="$2" p="$3" bg="$gray2" rounded="$3">
                    <Text color="$gray11" fontSize="$3">
                      You haven't added any friends yet. You can add this book
                      to your library now and lend it out later.
                    </Text>
                    <Button
                      size="$3"
                      variant="outlined"
                      onPress={() => router.push("/add-friend" as any)}
                    >
                      Add a Friend
                    </Button>
                  </YStack>
                ) : (
                  <>
                    <Select
                      id="borrowedBy"
                      value={borrowedBy}
                      onValueChange={setBorrowedBy}
                    >
                      <Select.Trigger iconAfter={ChevronDown}>
                        <Select.Value placeholder="Add to library (don't lend out)" />
                      </Select.Trigger>

                      <Adapt when="sm" platform="touch">
                        <Sheet
                          native={Platform.OS === "ios"}
                          modal
                          dismissOnSnapToBottom
                        >
                          <Sheet.Frame>
                            <Sheet.ScrollView>
                              <Adapt.Contents />
                            </Sheet.ScrollView>
                          </Sheet.Frame>
                          <Sheet.Overlay
                            animation="lazy"
                            enterStyle={{ opacity: 0 }}
                            exitStyle={{ opacity: 0 }}
                          />
                        </Sheet>
                      </Adapt>

                      <Select.Content>
                        <Select.Viewport minW={200}>
                          <Select.Group>
                            <Select.Label>Friends</Select.Label>
                            {friends.map((friend, idx) => (
                              <Select.Item
                                key={friend.id}
                                index={idx}
                                value={friend.id}
                              >
                                <Select.ItemText>{friend.name}</Select.ItemText>
                                <Select.ItemIndicator marginLeft="auto">
                                  <Check size={16} />
                                </Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.Group>
                        </Select.Viewport>
                      </Select.Content>
                    </Select>
                    {errors.borrowedBy && (
                      <Text color="$red10" fontSize="$2">
                        {errors.borrowedBy}
                      </Text>
                    )}
                  </>
                )}
              </YStack>

              {/* Notes */}
              <YStack gap="$2">
                <Label htmlFor="notes" fontSize="$4" fontWeight="600">
                  Notes
                </Label>
                <Input
                  id="notes"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any additional notes..."
                  multiline
                  numberOfLines={2}
                />
              </YStack>

              {/* Action Buttons */}
              <XStack gap="$3" pt="$2">
                <Button
                  flex={1}
                  variant="outlined"
                  onPress={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  flex={1}
                  bg="$blue10"
                  color="white"
                  onPress={handleSubmit}
                  disabled={saving || !title.trim()}
                >
                  {saving
                    ? "Saving..."
                    : borrowedBy
                    ? "Add & Lend Book"
                    : "Add to Library"}
                </Button>
              </XStack>
            </>
          )}
        </YStack>
      </ScrollView>
    </>
  );
}
