import { useState, useMemo, useCallback } from "react";
import {
  View,
  FlatList,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CardSearchInput } from "@/components/CardSearchInput";
import { ItemCard, calcCardLayout } from "@/components/ItemCard";
import { ErrorState } from "@/components/ErrorState";
import { CATEGORY_CONFIG } from "@/lib/category-config";
import { getAllFriendsItems } from "@/lib/services/friends";
import {
  getOutgoingBorrowRequests,
  createBorrowRequest,
  cancelBorrowRequest,
} from "@/lib/services/borrow-requests";
import * as toast from "@/lib/toast";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { TinyLabel } from "@/components/ui/typography";
import { Text } from "@/components/ui/text";
import type { ItemCategory, Item, BorrowRequest } from "lib/types";

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

function CategoryCard({
  category,
  itemWidth,
  itemHeight,
  cardBg,
  onPress,
}: {
  category: ItemCategory;
  itemWidth: number;
  itemHeight: number;
  cardBg: string;
  onPress: () => void;
}) {
  const cfg = CATEGORY_CONFIG[category];
  const Icon = cfg.Icon;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={{
          width: itemWidth,
          height: itemHeight,
          borderRadius: 20,
          backgroundColor: cardBg,
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          borderWidth: 1.5,
          borderColor: cfg.color + "40",
        }}
      >
        <Icon size={40} color={cfg.color} />
        <TinyLabel
          style={{ color: cfg.color, fontSize: 13, fontWeight: "500" }}
          className="normal-case tracking-normal"
        >
          {CATEGORY_LABELS[category]}
        </TinyLabel>
      </View>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestMap, setRequestMap] = useState<Map<string, BorrowRequest>>(new Map());
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;
  const { width } = useWindowDimensions();
  const { numColumns } = calcCardLayout(width);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, outgoing] = await Promise.all([
        getAllFriendsItems(),
        getOutgoingBorrowRequests(),
      ]);
      setItems(data);
      const map = new Map<string, BorrowRequest>();
      for (const req of outgoing) {
        if (req.status === "pending" || req.status === "approved") {
          map.set(req.itemId, req);
        }
      }
      setRequestMap(map);
    } catch {
      setError("Failed to load friends' items");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBorrow = useCallback(async (item: Item) => {
    setRequestingId(item.id);
    try {
      await createBorrowRequest(item.id, item.userId);
      toast.success("Request sent!");
      const outgoing = await getOutgoingBorrowRequests();
      const map = new Map<string, BorrowRequest>();
      for (const req of outgoing) {
        if (req.status === "pending" || req.status === "approved") {
          map.set(req.itemId, req);
        }
      }
      setRequestMap(map);
    } catch (e: any) {
      toast.error(e?.message || "Failed to send request");
    } finally {
      setRequestingId(null);
    }
  }, []);

  const handleCancel = useCallback(async (req: BorrowRequest) => {
    setRequestingId(req.itemId);
    try {
      await cancelBorrowRequest(req.id);
      toast.success("Request cancelled");
      setRequestMap((prev) => {
        const next = new Map(prev);
        next.delete(req.itemId);
        return next;
      });
    } catch (e: any) {
      toast.error(e?.message || "Failed to cancel request");
    } finally {
      setRequestingId(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems]),
  );

  const filteredItems = useMemo(() => {
    let result = items;
    if (selectedCategory) {
      result = result.filter((i) => i.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q));
    }
    return result;
  }, [items, selectedCategory, search]);

  const router = useRouter();
  const showGrid = selectedCategory === null && search.trim() === "";

  // Category grid sizing — mirrors add-item screen
  const outerPadding = 16;
  const gap = 12;
  const availableWidth = width - outerPadding * 2;
  const numCols = Math.max(2, Math.floor((availableWidth + gap) / (100 + gap)));
  const itemWidth = Math.floor((availableWidth - gap * (numCols - 1)) / numCols);
  const itemHeight = Math.round(itemWidth * 1.15);

  const rows: (ItemCategory | null)[][] = [];
  for (let i = 0; i < CATEGORIES.length; i += numCols) {
    const row = CATEGORIES.slice(i, i + numCols) as (ItemCategory | null)[];
    while (row.length < numCols) row.push(null);
    rows.push(row);
  }

  const activeCategoryColor = selectedCategory
    ? CATEGORY_CONFIG[selectedCategory].color
    : undefined;

  const categoryChip = selectedCategory && activeCategoryColor ? (
    <View style={{ flexDirection: "row", marginBottom: 4 }}>
      <Pressable onPress={() => setSelectedCategory(null)}>
        {({ pressed }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: activeCategoryColor + "18",
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              opacity: pressed ? 0.7 : 1,
            }}
          >
            <Text style={{ color: activeCategoryColor, fontSize: 13 }}>
              {CATEGORY_LABELS[selectedCategory]}
            </Text>
            <X size={11} color={activeCategoryColor} />
          </View>
        )}
      </Pressable>
    </View>
  ) : null;

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}>
        <ScreenHeader title="Explore" subtitle="Borrow from friends" />
        <ErrorState message={error} onRetry={loadItems} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}>
      <ScreenHeader title="Explore" subtitle="Borrow from friends" />

      {/* Search bar hoisted here so it never remounts when showGrid flips */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <CardSearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search friends' items…"
        />
      </View>

      {showGrid ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: outerPadding,
            paddingBottom: 160,
            gap: gap,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Category grid */}
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
                    <CategoryCard
                      key={category}
                      category={category}
                      itemWidth={itemWidth}
                      itemHeight={itemHeight}
                      cardBg={theme.card}
                      onPress={() => setSelectedCategory(category)}
                    />
                  ),
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          key={numColumns}
          data={filteredItems}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 160,
            gap: 12,
          }}
          showsVerticalScrollIndicator={false}
          onRefresh={loadItems}
          refreshing={loading}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={categoryChip}
          ListEmptyComponent={
            loading ? (
              <View style={{ alignItems: "center", paddingTop: 48 }}>
                <ActivityIndicator color={theme.primary} size="large" />
              </View>
            ) : (
              <View style={{ alignItems: "center", paddingTop: 48 }}>
                <Text className="text-muted-foreground text-center">
                  {selectedCategory
                    ? `No ${CATEGORY_LABELS[selectedCategory].toLowerCase()} items listed by your friends`
                    : "No items match your search"}
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            const req = requestMap.get(item.id);
            return (
              <ItemCard
                item={item}
                request={req}
                isRequesting={requestingId === item.id}
                onBorrow={() => handleBorrow(item)}
                onCancel={req ? () => handleCancel(req) : undefined}
                style={{ flex: 1 }}
                onPress={() => router.push(`/item/${item.id}` as any)}
              />
            );
          }}
        />
      )}
    </View>
  );
}
