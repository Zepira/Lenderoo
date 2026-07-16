import { useEffect, useMemo, useState, useCallback } from "react";
import { View, FlatList, useWindowDimensions, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useBorrowedByMeItems } from "hooks/useItems";
import { getMyFavouriteItemIds, setItemFavourite } from "@/lib/services/favourites";
import * as toast from "@/lib/toast";
import { sortFavouritesFirst } from "@/lib/utils";
import { ItemCard, calcCardLayout } from "@/components/ItemCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CardSearchInput } from "@/components/CardSearchInput";
import { THEME } from "@/lib/theme";
import { useThemeContext } from "@/contexts/ThemeContext";
import { ErrorState } from "@/components/ErrorState";
import { Text } from "@/components/ui/text";
import type { Item } from "lib/types";

export default function BorrowedItemsScreen() {
  const [search, setSearch] = useState("");
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  const { width: screenWidth } = useWindowDimensions();
  const { numColumns } = calcCardLayout(screenWidth);

  const { items, loading, error, refresh } = useBorrowedByMeItems();
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  // Gates the FlatList's data so favourite-sorted order is applied before
  // paint, instead of showing unsorted items and then visibly re-sorting
  // once favourites arrive a beat later — see app/(tabs)/library/index.tsx.
  const [favouritesReady, setFavouritesReady] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    getMyFavouriteItemIds(items.map((i) => i.id)).then((ids) => {
      if (cancelled) return;
      setFavouriteIds(ids);
      setFavouritesReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    const result = search.trim()
      ? items.filter((item) => item.name.toLowerCase().includes(q))
      : items;
    const withFavourites = result.map((i) => ({
      ...i,
      isFavourite: favouriteIds.has(i.id),
    }));
    return sortFavouritesFirst(withFavourites);
  }, [items, search, favouriteIds]);

  const handleToggleFavourite = useCallback(
    async (item: Item) => {
      const next = !favouriteIds.has(item.id);
      setFavouriteIds((prev) => {
        const set = new Set(prev);
        next ? set.add(item.id) : set.delete(item.id);
        return set;
      });
      try {
        await setItemFavourite(item.id, next);
      } catch {
        setFavouriteIds((prev) => {
          const set = new Set(prev);
          next ? set.delete(item.id) : set.add(item.id);
          return set;
        });
        toast.error("Failed to update favourite");
      }
    },
    [favouriteIds],
  );

  if (error && !loading && items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}>
        <ScreenHeader title="Borrowed Items" onBack={() => router.back()} />
        <ErrorState
          message="Couldn't load your borrowed items. Please try again."
          onRetry={refresh}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}>
      <ScreenHeader title="Borrowed Items" onBack={() => router.back()} />

      <FlatList
        key={numColumns}
        data={favouritesReady || items.length === 0 ? filteredItems : []}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 160, gap: 12 }}
        showsVerticalScrollIndicator={false}
        onRefresh={refresh}
        refreshing={loading}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <CardSearchInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search borrowed items…"
            />
          </View>
        }
        ListEmptyComponent={
          !favouritesReady && items.length > 0 ? (
            <View style={{ alignItems: "center", paddingTop: 48 }}>
              <ActivityIndicator color={theme.primary} size="large" />
            </View>
          ) : favouritesReady ? (
            <View style={{ alignItems: "center", paddingTop: 48 }}>
              <Text className="text-muted-foreground text-center">
                {search ? "No borrowed items match your search" : "You're not borrowing anything right now"}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onPress={() => router.push(`/item/${item.id}` as any)}
            onToggleFavourite={() => handleToggleFavourite(item)}
            onChanged={refresh}
            style={{ flex: 1 }}
          />
        )}
      />
    </View>
  );
}
