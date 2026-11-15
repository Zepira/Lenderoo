import { useCallback, useMemo, useState, type ReactElement } from "react";
import { View, FlatList, ActivityIndicator, Pressable, useWindowDimensions } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Bell, BellOff } from "lucide-react-native";
import { ItemCard, calcCardLayout } from "@/components/ItemCard";
import { CardSearchInput } from "@/components/CardSearchInput";
import { ItemFilterBar } from "@/components/ItemFilterBar";
import { EmptyState } from "@/components/EmptyState";
import { Caption } from "@/components/ui/typography";
import { useItemFilters } from "@/hooks/useItemFilters";
import { useSaved, type SavedItem } from "@/hooks/useSaved";
import { useFriends } from "@/hooks/useFriends";
import { useOutgoingBorrowRequests } from "@/hooks/useBorrowRequests";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { isFree, possessive, savedStatus } from "@/lib/saved";
import type { BorrowRequest } from "@/lib/types";
import * as toast from "@/lib/toast";

/**
 * Library → Saved: friends' things you've hearted, to come back to (migration 052). Each card says
 * whose it is and whether it's free, with a bell to turn the "it's free again" alert on or off.
 */
/** `bottomSpace`: the screen's full bottom padding (useTabBarSpace). */
export function SavedList({ header, bottomSpace }: { header: ReactElement; bottomSpace: number }) {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;
  const { width } = useWindowDimensions();
  const { numColumns, cardWidth } = calcCardLayout(width);
  const { saved, loading, refresh, unsave, setNotify } = useSaved();
  const { friends } = useFriends();
  const { requests, refresh: refreshRequests } = useOutgoingBorrowRequests();
  const [search, setSearch] = useState("");
  // Item status changes (returns, loans) and hearts from other screens: catch up on focus.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const names = useMemo(() => new Map(friends.map((f) => [f.id, f.name])), [friends]);
  const requestMap = useMemo(() => {
    const map = new Map<string, BorrowRequest>();
    for (const r of requests) if (r.status === "pending" || r.status === "approved") map.set(r.itemId, r);
    return map;
  }, [requests]);
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? saved.filter((i) => i.name.toLowerCase().includes(q)) : saved;
  }, [saved, search]);
  // Saved order (free first) unless the person picks a sort.
  const filters = useItemFilters(searched);
  const shown = filters.sort === "recent" && !filters.category ? searched : filters.filtered;

  const handleUnsave = async (item: SavedItem) => {
    try {
      await unsave(item.id);
      toast.show(`Removed “${item.name}” from Saved`);
    } catch {
      toast.error("Couldn't remove it. Try again.");
    }
  };
  const handleNotify = async (item: SavedItem) => {
    try {
      await setNotify(item.id, !item.notify);
      toast.show(item.notify ? "Alert off for this item" : "We'll tell you when it's free");
    } catch {
      toast.error("Couldn't change the alert. Try again.");
    }
  };

  return (
    <FlatList
      key={numColumns}
      data={shown}
      keyExtractor={(i) => i.id}
      numColumns={numColumns}
      columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: bottomSpace, gap: 12 }}
      showsVerticalScrollIndicator={false}
      onRefresh={() => {
        void refresh();
        void refreshRequests();
      }}
      refreshing={false}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          {header}
          {saved.length > 0 && (
            <>
              <CardSearchInput value={search} onChangeText={setSearch} placeholder="Search saved items…" />
              <ItemFilterBar
                items={searched}
                category={filters.category}
                sort={filters.sort}
                onCategoryChange={filters.setCategory}
                onSortChange={filters.setSort}
                bleed={16}
                defaultSortLabel={{ short: "Free first", long: "Free to borrow first" }}
              />
            </>
          )}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <View style={{ alignItems: "center", paddingTop: 48 }}>
            <ActivityIndicator color={theme.primary} size="large" />
          </View>
        ) : saved.length === 0 ? (
          <EmptyState
            icon="Heart"
            title="Nothing saved yet"
            message="Tap the heart on a friend's item to save it for later: a book for when you've got time, or gear you'd like to borrow again. We'll tell you when it's free."
            actionLabel="Explore friends' items"
            onAction={() => router.push("/(tabs)/explore" as any)}
          />
        ) : (
          <Caption style={{ textAlign: "center", paddingTop: 24 }}>No saved items match.</Caption>
        )
      }
      renderItem={({ item }) => {
        const free = isFree(item);
        return (
          <View style={{ width: cardWidth, gap: 6 }}>
            <ItemCard
              item={item}
              request={requestMap.get(item.id)}
              onToggleFavourite={() => void handleUnsave(item)}
              onChanged={() => {
                void refresh();
                void refreshRequests();
              }}
              onPress={() => router.push(`/item/${item.id}` as any)}
              style={{ width: cardWidth }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 }}>
              <View style={{ flex: 1 }}>
                <Caption numberOfLines={1} style={{ color: theme.foreground, fontWeight: "600" }}>
                  {possessive(names.get(item.userId))}
                </Caption>
                <Caption
                  numberOfLines={1}
                  style={{ color: free ? theme.primaryInk : theme.mutedForeground, fontSize: 12, lineHeight: 16 }}
                >
                  {savedStatus(item)}
                </Caption>
              </View>
              {!free && (
                <Pressable
                  onPress={() => void handleNotify(item)}
                  hitSlop={8}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: item.notify }}
                  accessibilityLabel={`Tell me when “${item.name}” is free`}
                  style={{ padding: 4 }}
                >
                  {item.notify ? (
                    <Bell size={16} color={theme.primaryInk} />
                  ) : (
                    <BellOff size={16} color={theme.mutedForeground} />
                  )}
                </Pressable>
              )}
            </View>
          </View>
        );
      }}
    />
  );
}
