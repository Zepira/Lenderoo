import { useState } from "react";
import { useRouter, useRootNavigation } from "expo-router";
import { View, Pressable, ScrollView, useWindowDimensions, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, X, ScanBarcode } from "lucide-react-native";
import { CATEGORY_CONFIG } from "@/lib/category-config";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { PageTitle, TinyLabel, Caption } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { lookupBarcode } from "@/lib/services/upcitemdb";
import { searchBooks } from "@/lib/services/hardcover";
import * as toast from "@/lib/toast";
import type { ItemCategory } from "lib/types";

// ISBN-13 barcodes always carry the Bookland EAN prefix 978/979 — UPCitemdb's
// free tier has weak book coverage, so route these straight to Hardcover
// (the same source the dedicated book-search flow uses) instead.
const ISBN_13_PATTERN = /^97[89]\d{10}$/;

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as ItemCategory[];

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  book: "Book",
  tool: "Tool",
  clothing: "Clothing",
  electronics: "Electronics",
  game: "Game",
  sports: "Sports",
  kitchen: "Kitchen",
  other: "Other",
};

export default function SelectCategoryScreen() {
  const router = useRouter();
  const rootNavigation = useRootNavigation();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;
  const { width } = useWindowDimensions();
  const [showScanner, setShowScanner] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  const handleBookIsbnScan = async (isbn: string): Promise<boolean> => {
    const apiToken = process.env.EXPO_PUBLIC_HARDCOVER_API_TOKEN || "";
    const results = await searchBooks(isbn, apiToken);
    console.log("[add-item] hardcover ISBN search hit count:", results.length);
    const entry = results[0];
    if (!entry) return false;

    const book = entry.document;
    const author: string[] = [];
    (book.contributions || []).forEach((c: any) => {
      if (!c.contribution && c.author?.name) author.push(c.author.name);
    });
    const publicationYear = book.release_date
      ? new Date(book.release_date).getFullYear()
      : undefined;
    const genres = book.genres || [];

    const params = new URLSearchParams({
      title: book.title || "",
      author: author.join(", "),
      ...(book.featured_series?.series?.name && {
        seriesName: book.featured_series.series.name,
      }),
      ...(book.featured_series_position && {
        seriesNumber: String(book.featured_series_position),
      }),
      ...(book.featured_series?.series?.id && {
        seriesId: String(book.featured_series.series.id),
      }),
      ...((book.image?.url || book.cover_image_url) && {
        coverUrl: book.image?.url || book.cover_image_url,
      }),
      ...(genres.length > 0 && { genre: genres.join(", ") }),
      ...(book.description && { description: book.description }),
      isbn,
      ...(book.pages && { pageCount: String(book.pages) }),
      ...(publicationYear && { publicationYear: String(publicationYear) }),
      ...(book.rating && { averageRating: String(book.rating) }),
      ...(book.id && { hardcoverId: String(book.id) }),
    });
    router.push(`/add-item/book?${params.toString()}` as any);
    return true;
  };

  const handleBarcodeScanned = async (barcode: string) => {
    console.log("[add-item] scanned barcode:", JSON.stringify(barcode));
    setShowScanner(false);
    setLookingUp(true);
    try {
      if (ISBN_13_PATTERN.test(barcode)) {
        const found = await handleBookIsbnScan(barcode);
        if (found) return;
        console.log("[add-item] ISBN not found in Hardcover, falling back to UPCitemdb");
      }

      const result = await lookupBarcode(barcode);
      console.log("[add-item] lookupBarcode result:", JSON.stringify(result));
      if (!result) {
        toast.error("Couldn't find that barcode.");
        return;
      }
      const params = new URLSearchParams({
        category: result.category,
        ...(result.title && { name: result.title }),
        ...(result.description && { description: result.description }),
        ...(result.images?.[0] && { imageUrl: result.images[0] }),
      });
      router.push(`/add-item/generic?${params.toString()}` as any);
    } catch (err) {
      console.log("[add-item] barcode lookup error:", err);
      toast.error("Barcode lookup failed.");
    } finally {
      setLookingUp(false);
    }
  };

  const outerPadding = 24;
  const gap = 12;
  const availableWidth = width - outerPadding * 2;

  // ~90px min gives 4 cols on 390px phone, more on tablets — keeps the grid
  // compact so it plus the scan button fits on shorter Android screens.
  const numColumns = Math.max(
    3,
    Math.floor((availableWidth + gap) / (90 + gap)),
  );
  const itemWidth = Math.floor(
    (availableWidth - gap * (numColumns - 1)) / numColumns,
  );
  const itemHeight = Math.round(itemWidth * 1.0);

  // Split into rows, padding the last row with nulls so widths stay consistent
  const rows: (ItemCategory | null)[][] = [];
  for (let i = 0; i < CATEGORIES.length; i += numColumns) {
    const row = CATEGORIES.slice(i, i + numColumns) as (ItemCategory | null)[];
    while (row.length < numColumns) row.push(null);
    rows.push(row);
  }

  const handleCategorySelect = (category: ItemCategory) => {
    if (category === "book") {
      router.push("/add-item/search" as any);
    } else {
      router.push(`/add-item/generic?category=${category}` as any);
    }
  };

  const renderButton = (category: ItemCategory) => {
    const cfg = CATEGORY_CONFIG[category];
    return (
      <Pressable
        key={category}
        onPress={() => handleCategorySelect(category)}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <View
          style={{
            width: itemWidth,
            height: itemHeight,
            borderRadius: 20,
            backgroundColor: theme.card,
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            borderWidth: 1.5,
            borderColor: cfg.color + "40",
          }}
        >
          <cfg.Icon size={40} color={cfg.color} />
          <TinyLabel
            style={{ color: cfg.color, fontSize: 13, fontWeight: "500" }}
            className="normal-case tracking-normal"
          >
            {CATEGORY_LABELS[category]}
          </TinyLabel>
        </View>
      </Pressable>
    );
  };

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
        }}
      >
        <SafeAreaView
          edges={["top"]}
          style={{ backgroundColor: "transparent" }}
        >
          <View
            style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28 }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
            >
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
              <PageTitle style={{ flex: 1 }}>Add New Item</PageTitle>
              <Pressable
                onPress={() => rootNavigation?.goBack()}
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
                <X size={20} color={theme.mutedForeground} />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: outerPadding,
          paddingTop: 24,
          paddingBottom: 24,
          gap: 16,
        }}
      >
        {/* Grid */}
        <View style={{ gap }}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={{ flexDirection: "row", gap }}>
              {row.map((category, colIndex) =>
                category === null ? (
                  <View
                    key={`spacer-${colIndex}`}
                    style={{ width: itemWidth, height: itemHeight }}
                  />
                ) : (
                  renderButton(category)
                ),
              )}
            </View>
          ))}
        </View>

        <Button
          variant="outline"
          onPress={() => setShowScanner(true)}
          disabled={lookingUp}
        >
          {lookingUp ? (
            <ActivityIndicator size="small" color={theme.foreground} />
          ) : (
            <ScanBarcode size={18} color={theme.foreground} />
          )}
          <Text>{lookingUp ? "Looking up…" : "Scan Barcode"}</Text>
        </Button>
      </ScrollView>

      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        title="Scan Barcode"
        onScanned={handleBarcodeScanned}
      />
    </View>
  );
}
