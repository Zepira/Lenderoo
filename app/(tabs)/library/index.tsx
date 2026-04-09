import { useEffect, useMemo, useState, useCallback } from "react";
import { View, FlatList, useWindowDimensions, Pressable } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Plus } from "lucide-react-native";
import { BorrowRequestsSection } from "components/BorrowRequestsSection";
import { useItems } from "hooks/useItems";
import type { ItemStatus, BorrowRequestWithDetails } from "lib/types";
import { getIncomingBorrowRequests, approveBorrowRequest, denyBorrowRequest } from "@/lib/borrow-requests-service";
import { supabase } from "@/lib/supabase";
import * as toast from "@/lib/toast";
import { ItemCard, calcCardLayout } from "@/components/ItemCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CardSearchInput } from "@/components/CardSearchInput";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { THEME } from "@/lib/theme";
import { useThemeContext } from "@/contexts/ThemeContext";

type FilterTab = "all" | "available" | "lent";

export default function ItemsScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [incomingRequests, setIncomingRequests] = useState<BorrowRequestWithDetails[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  const filter = useMemo(() => {
    if (activeFilter === "available") return { status: "available" as ItemStatus };
    if (activeFilter === "lent") return { status: "borrowed" as ItemStatus };
    return undefined;
  }, [activeFilter]);

  const { width: screenWidth } = useWindowDimensions();
  const { numColumns } = calcCardLayout(screenWidth);

  const { items, loading, refresh } = useItems(filter);
  const { items: allItems } = useItems();

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, search]);

  const allCount = allItems.length;
  const availableCount = useMemo(
    () => allItems.filter((i) => !i.borrowedBy && !i.returnedDate).length,
    [allItems],
  );
  const lentCount = useMemo(
    () => allItems.filter((i) => !!i.borrowedBy && !i.returnedDate).length,
    [allItems],
  );

  const loadIncomingRequests = async () => {
    try {
      const requests = await getIncomingBorrowRequests();
      setIncomingRequests(requests);
    } catch (error) {
      console.error("❌ Error loading borrow requests:", error);
    }
  };

  useEffect(() => {
    loadIncomingRequests();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      loadIncomingRequests();
    }, [refresh]),
  );

  useEffect(() => {
    let channel: any;
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel("borrow-requests-library")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "borrow_requests",
          filter: `owner_id=eq.${user.id}`,
        }, () => {
          loadIncomingRequests();
          refresh();
        })
        .subscribe();
    };
    setupSubscription();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const handleApproveBorrowRequest = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      await approveBorrowRequest(requestId);
      toast.success("Request approved!");
      await loadIncomingRequests();
      await refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDenyBorrowRequest = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      await denyBorrowRequest(requestId);
      toast.success("Request denied");
      await loadIncomingRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to deny request");
    } finally {
      setProcessingId(null);
    }
  };

  const tabs = [
    { key: "all", label: "All", count: allCount },
    { key: "available", label: "Available", count: availableCount },
    { key: "lent", label: "Lent Out", count: lentCount },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}>
      <ScreenHeader
        title="My Library"
        right={
          <Pressable
            onPress={() => router.push("/add-item")}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: THEME.light.primary + "18",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Plus size={22} color={THEME.light.primary} />
          </Pressable>
        }
      />

      <FlatList
        key={numColumns}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 160, gap: 12 }}
        showsVerticalScrollIndicator={false}
        onRefresh={refresh}
        refreshing={loading}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <BorrowRequestsSection
              requests={incomingRequests}
              onApprove={handleApproveBorrowRequest}
              onDeny={handleDenyBorrowRequest}
              processingId={processingId || undefined}
            />
            <CardSearchInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search items…"
            />
            <SegmentedTabs
              tabs={tabs}
              activeKey={activeFilter}
              onChange={(key) => setActiveFilter(key as FilterTab)}
            />
          </View>
        }
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onPress={() => router.push(`/library/${item.id}` as any)}
            style={{ flex: 1 }}
          />
        )}
      />
    </View>
  );
}
