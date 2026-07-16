import {
  View,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHero, LabelStrong } from "@/components/ui/typography";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useActiveItems,
  useBorrowedByMeItems,
  useItems,
  useItemsByIds,
} from "hooks/useItems";
import { useOutgoingBorrowRequests } from "hooks/useBorrowRequests";
import { getPendingActionPriority } from "@/lib/utils";
import * as toast from "@/lib/toast";
import { getMyFavouriteItemIds, setItemFavourite } from "@/lib/services/favourites";
import type { Item } from "lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ErrorState } from "@/components/ErrorState";

export default function HomeScreen() {
  const { appUser, user } = useAuth();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  const {
    items: lentOutItems,
    loading: lentLoading,
    error: lentError,
    refresh: refreshLent,
  } = useActiveItems();
  const {
    items: borrowedItems,
    loading: borrowedLoading,
    error: borrowedError,
    refresh: refreshBorrowed,
  } = useBorrowedByMeItems();
  const { items: allItems, error: allError, refresh: refreshAll } = useItems();
  const {
    requests: outgoingRequests,
    loading: outgoingLoading,
    refresh: refreshOutgoing,
  } = useOutgoingBorrowRequests();
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());

  const activeOutgoingRequests = outgoingRequests.filter(
    (r) => r.status === "pending" || r.status === "approved",
  );
  const outgoingRequestsByItemId = new Map(
    activeOutgoingRequests.map((r) => [r.itemId, r]),
  );

  // react-query-backed per-id lookups (not just a one-off fetch) so these
  // items stay live — the global realtime sync invalidates the whole
  // `['items']` prefix on any items table change, which includes these.
  const { items: requestedItemsRaw } = useItemsByIds(
    activeOutgoingRequests.map((r) => r.itemId),
  );
  // Once pickup is confirmed the request row stays "approved" (it now
  // represents the active borrow) — exclude items already in hand so they
  // only show in "Borrowed", not "Requested" too.
  const requestedItems = requestedItemsRaw.filter(
    (i) => i.borrowedBy !== user?.id,
  );

  const loading = lentLoading || borrowedLoading;
  const error = lentError || borrowedError || allError;

  useEffect(() => {
    const ids = [...lentOutItems, ...borrowedItems, ...requestedItems].map(
      (i) => i.id,
    );
    if (ids.length === 0) return;
    getMyFavouriteItemIds(ids).then(setFavouriteIds);
  }, [lentOutItems, borrowedItems, requestedItems]);

  const withFavourite = (list: Item[]) =>
    list.map((i) => ({ ...i, isFavourite: favouriteIds.has(i.id) }));

  const handleToggleFavourite = async (item: Item) => {
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
  };

  const scrollRef = useRef<ScrollView>(null);
  const firstName = appUser?.name?.split(" ")[0] ?? "there";

  const refresh = async () => {
    await Promise.all([
      refreshLent(),
      refreshBorrowed(),
      refreshAll(),
      refreshOutgoing(),
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
      refresh();
    }, [refreshLent, refreshBorrowed, refreshAll]),
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}
    >
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={THEME.light.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {/* Header — no top radius so pull-down shows white, not grey */}
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
            overflow: "hidden",
          }}
        >
          <SafeAreaView edges={["top"]}>
            <View
              style={{
                paddingTop: 20,
                paddingBottom: 36,
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
              }}
            >
              {/* Left: greeting */}
              <View style={{ flex: 1, paddingLeft: 24 }}>
                <PageHero>Hi {firstName}</PageHero>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 4,
                    gap: 8,
                  }}
                >
                  <LabelStrong className="text-muted-foreground">
                    {borrowedItems.length} borrowed
                  </LabelStrong>
                  <LabelStrong className="text-primary">•</LabelStrong>
                  <LabelStrong className="text-muted-foreground">
                    {lentOutItems.length} lent
                  </LabelStrong>
                </View>
              </View>

              {/* Right: kangaroo mascot — hugs the right edge */}
              <Image
                source={require("../../assets/images/kangaroo.png")}
                style={{
                  width: 200,
                  height: 200,
                  marginRight: -30,
                  marginBottom: -60,
                  marginTop: -60,
                }}
                resizeMode="contain"
              />
            </View>
          </SafeAreaView>
        </View>

        {error && !loading && (
          <ErrorState
            message="Couldn't load your items. Pull down to retry."
            onRetry={refresh}
          />
        )}

        {/* Stats grid */}
        <View style={{ paddingHorizontal: 24, marginTop: 28 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatCard
              label="In Library"
              value={allItems.length}
              unit="Total items"
            />
            <StatCard
              label="Lent Out"
              value={lentOutItems.length}
              unit="Right now"
            />
            <StatCard
              label="Borrowed"
              value={borrowedItems.length}
              unit="By me"
            />
          </View>
        </View>

        {/* Sections */}
        <View style={{ paddingHorizontal: 24, marginTop: 36, gap: 36 }}>
          {loading &&
          borrowedItems.length === 0 &&
          lentOutItems.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={THEME.light.primary} />
            </View>
          ) : (
            <>
              <DashboardSection
                title="Requested"
                items={withFavourite(requestedItems)}
                onItemPress={(item) => router.push(`/item/${item.id}` as any)}
                onToggleFavourite={handleToggleFavourite}
                getRequest={(item) => outgoingRequestsByItemId.get(item.id)}
                onChanged={refresh}
                getPriority={(item) => getPendingActionPriority(item, user?.id)}
              />
              <DashboardSection
                title="Borrowed"
                items={withFavourite(borrowedItems)}
                onItemPress={(item) => router.push(`/item/${item.id}` as any)}
                onToggleFavourite={handleToggleFavourite}
                onViewAll={() => router.push("/borrowed" as any)}
                onChanged={refresh}
                getPriority={(item) => getPendingActionPriority(item, user?.id)}
              />
              <DashboardSection
                title="Lending"
                items={withFavourite(lentOutItems)}
                onItemPress={(item) => router.push(`/item/${item.id}` as any)}
                onToggleFavourite={handleToggleFavourite}
                onViewAll={() => router.push("/(tabs)/library?filter=lent" as any)}
                onChanged={refresh}
                getPriority={(item) => getPendingActionPriority(item, user?.id)}
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
