import { useState, useEffect, useCallback } from "react";
import {
  useLocalSearchParams,
  useRouter,
  useNavigation,
  useFocusEffect,
} from "expo-router";
import {
  ScrollView,
  View,
  Image,
  Alert,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Trash2,
  Clock,
  History,
  Package,
  CheckCircle2,
} from "lucide-react-native";
import { ItemCard } from "@/components/ItemCard";
import { Text } from "@/components/ui/text";
import { resolveAvatarSource } from "@/lib/services/avatar";
import { getInitials, calculateItemStatus } from "lib/utils";
import type { Item } from "lib/types";
import {
  getFriendUserById,
  getItemsBorrowedByFriend,
  getItemsOwnedByFriend,
  removeFriend,
  type FriendUser,
} from "@/lib/services/friends";
import {
  createBorrowRequest,
  getBorrowRequestsForItem,
  getMyBorrowRequestForItem,
} from "@/lib/services/borrow-requests";
import { useMarkItemReturned } from "hooks/useItems";
import { useAuth } from "@/contexts/AuthContext";

import type { BorrowRequest, BorrowRequestWithDetails } from "@/lib/types";
import * as toast from "@/lib/toast";
import { supabase } from "@/lib/supabase";
import { THEME } from "@/lib/theme";
import { useThemeContext } from "@/contexts/ThemeContext";
import {
  PageTitle,
  SectionHeading,
  StatDisplay,
  BodyStrong,
  LabelStrong,
  Caption,
  TinyLabel,
} from "@/components/ui/typography";

// ── Tab type ──────────────────────────────────────────────────────────────────
type Tab = "library" | "borrowing" | "history";

// ── DB conversion ─────────────────────────────────────────────────────────────
function convertItemFromDb(data: any): Item {
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    description: data.description,
    category: data.category,
    images: data.images,
    borrowedBy: data.borrowed_by,
    borrowedDate: data.borrowed_date ? new Date(data.borrowed_date) : undefined,
    dueDate: data.due_date ? new Date(data.due_date) : undefined,
    returnedDate: data.returned_date ? new Date(data.returned_date) : undefined,
    notes: data.notes,
    metadata: data.metadata,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function FriendDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  const { user } = useAuth();
  const { markReturned, loading: returning } = useMarkItemReturned();

  const [activeTab, setActiveTab] = useState<Tab>("library");
  const [friend, setFriend] = useState<FriendUser | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [ownedItems, setOwnedItems] = useState<Item[]>([]);
  const [borrowRequests, setBorrowRequests] = useState<
    Map<string, BorrowRequest>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [ownedItemsLoading, setOwnedItemsLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [requestingItemId, setRequestingItemId] = useState<string | null>(null);

  // Load friend
  useEffect(() => {
    async function loadFriend() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getFriendUserById(id);
        if (!data) {
          router.back();
          return;
        }
        setFriend(data);
      } catch {
        toast.error("Failed to load friend details");
      } finally {
        setLoading(false);
      }
    }
    loadFriend();
  }, [id, router, navigation]);

  // Load items borrowed by friend (from me)
  useEffect(() => {
    async function loadItems() {
      if (!id) return;
      try {
        const data = await getItemsBorrowedByFriend(id);
        setItems(data.map(convertItemFromDb));
      } catch {}
    }
    loadItems();
    if (!id) return;
    const ch = supabase
      .channel(`friend-${id}-borrowed-items`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        loadItems,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id]);

  // Load items owned by friend (extracted to component scope so handleReturn can call it)
  const loadOwnedItems = useCallback(async () => {
    if (!id) return;
    try {
      setOwnedItemsLoading(true);
      const data = await getItemsOwnedByFriend(id);
      const converted = data.map(convertItemFromDb);
      setOwnedItems(converted);
      // For each item, fetch the current user's own active request directly
      // from borrow_requests (not the view) to avoid any RLS/view edge cases.
      const map = new Map<string, BorrowRequest>();
      await Promise.all(
        converted.map(async (item) => {
          try {
            const req = await getMyBorrowRequestForItem(item.id);
            if (req) map.set(item.id, req);
          } catch {}
        }),
      );
      setBorrowRequests(map);
    } catch {
    } finally {
      setOwnedItemsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOwnedItems();
    if (!id) return;
    const ich = supabase
      .channel(`friend-${id}-owned-items`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        loadOwnedItems,
      )
      .subscribe();
    const rch = supabase
      .channel(`friend-${id}-borrow-requests`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "borrow_requests" },
        loadOwnedItems,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ich);
      supabase.removeChannel(rch);
    };
  }, [id, loadOwnedItems]);

  // Refresh owned items whenever this screen comes back into focus
  // (e.g. after returning an item from the item detail screen)
  useFocusEffect(
    useCallback(() => {
      loadOwnedItems();
    }, [loadOwnedItems]),
  );

  const activeItems = items.filter((i) => !i.returnedDate);
  const returnedItems = items.filter((i) => i.returnedDate);

  const handleDelete = async () => {
    if (!friend) return;
    if (activeItems.length > 0) {
      const msg = `Cannot remove ${friend.name} — they still have ${activeItems.length} unreturned item${activeItems.length !== 1 ? "s" : ""}.`;
      Platform.OS === "web"
        ? alert(msg)
        : Alert.alert("Cannot Remove", msg, [{ text: "OK" }]);
      return;
    }
    const msg = `Remove ${friend.name} from your friends? This cannot be undone.`;
    const confirmed = await (Platform.OS === "web"
      ? Promise.resolve(confirm(msg))
      : new Promise<boolean>((res) =>
          Alert.alert("Remove Friend", msg, [
            { text: "Cancel", style: "cancel", onPress: () => res(false) },
            { text: "Remove", style: "destructive", onPress: () => res(true) },
          ]),
        ));
    if (!confirmed) return;
    try {
      setDeleting(true);
      await removeFriend(friend.id);
      toast.success(`Removed ${friend.name}`);
      router.back();
    } catch {
      toast.error("Failed to remove friend");
    } finally {
      setDeleting(false);
    }
  };

  const handleRequestBorrow = async (item: Item) => {
    if (!friend) return;
    try {
      setRequestingItemId(item.id);
      await createBorrowRequest(item.id, friend.id);
      toast.success(`Request sent to ${friend.name}`);
      const req = await getMyBorrowRequestForItem(item.id);
      setBorrowRequests((prev) => {
        const m = new Map(prev);
        if (req) m.set(item.id, req);
        return m;
      });
    } catch (e: any) {
      toast.error(e?.message || "Failed to send request");
    } finally {
      setRequestingItemId(null);
    }
  };

  const handleCancelRequest = async (item: Item) => {
    const request = borrowRequests.get(item.id);
    if (!request) return;
    try {
      setRequestingItemId(item.id);
      const { cancelBorrowRequest } =
        await import("@/lib/services/borrow-requests");
      await cancelBorrowRequest(request.id);
      toast.success("Request cancelled");
      setBorrowRequests((prev) => {
        const m = new Map(prev);
        m.delete(item.id);
        return m;
      });
    } catch (e: any) {
      toast.error(e?.message || "Failed to cancel request");
    } finally {
      setRequestingItemId(null);
    }
  };

  const handleReturn = async (item: Item) => {
    try {
      setRequestingItemId(item.id);
      await markReturned(item.id);
      toast.success(`"${item.name}" marked as returned`);
      await loadOwnedItems();
    } catch (e: any) {
      toast.error(e?.message || "Failed to mark as returned");
    } finally {
      setRequestingItemId(null);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading || !friend) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator size="large" color={THEME.light.primary} />
      </View>
    );
  }

  const firstName = friend.name.split(" ")[0];
  const avatarSrc = resolveAvatarSource(friend.avatarUrl);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "library", label: "Library", count: ownedItems.length },
    { key: "borrowing", label: "Borrowed", count: activeItems.length },
    { key: "history", label: "History", count: returnedItems.length },
  ];

  return (
    <View
      style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {/* ── Header card ── */}
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
          <SafeAreaView
            edges={["top"]}
            style={{ backgroundColor: "transparent" }}
          >
            <View
              style={{
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: 28,
              }}
            >
              {/* Top row: back + delete */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 24,
                }}
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
                <Pressable
                  onPress={handleDelete}
                  disabled={deleting}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: THEME.light.destructive + "15",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed || deleting ? 0.6 : 1,
                  })}
                >
                  <Trash2 size={18} color={THEME.light.destructive} />
                </Pressable>
              </View>

              {/* Avatar + name */}
              <View style={{ alignItems: "center", marginBottom: 24 }}>
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 32,
                    overflow: "hidden",
                    borderWidth: 3,
                    borderColor: THEME.light.primary + "33",
                    backgroundColor: THEME.light.primary + "22",
                    marginBottom: 12,
                  }}
                >
                  {avatarSrc ? (
                    <Image
                      source={avatarSrc}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <BodyStrong
                        className="text-primary"
                        style={{ fontSize: 32, lineHeight: 42 }}
                      >
                        {getInitials(friend.name)}
                      </BodyStrong>
                    </View>
                  )}
                </View>
                <SectionHeading>{friend.name}</SectionHeading>
                {friend.email && (
                  <Caption style={{ marginTop: 4 }}>{friend.email}</Caption>
                )}
              </View>

              {/* Stats row */}
              {(() => {
                const availableCount = ownedItems.filter(
                  (i) => calculateItemStatus(i) === "available",
                ).length;
                const borrowedCount = ownedItems.length - availableCount;
                return (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 32,
                    }}
                  >
                    <View style={{ alignItems: "center" }}>
                      <StatDisplay className="text-secondary">
                        {ownedItems.length}
                      </StatDisplay>
                      <TinyLabel>Items</TinyLabel>
                    </View>
                    <View style={{ width: 1, backgroundColor: theme.border }} />
                    <View style={{ alignItems: "center" }}>
                      <StatDisplay className="text-primary">
                        {availableCount}
                      </StatDisplay>
                      <TinyLabel>Available</TinyLabel>
                    </View>
                    <View style={{ width: 1, backgroundColor: theme.border }} />
                    <View style={{ alignItems: "center" }}>
                      <StatDisplay className="text-muted-foreground">
                        {borrowedCount}
                      </StatDisplay>
                      <TinyLabel>Borrowed</TinyLabel>
                    </View>
                  </View>
                );
              })()}
            </View>
          </SafeAreaView>
        </View>

        <View style={{ paddingHorizontal: 24, gap: 20 }}>
          {/* ── Tab switcher ── */}
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 20,
              padding: 6,
              flexDirection: "row",
              gap: 4,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            {TABS.map(({ key, label, count }) => {
              const active = activeTab === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setActiveTab(key)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 14,
                    alignItems: "center",
                    backgroundColor: active
                      ? THEME.light.primary
                      : "transparent",
                  }}
                >
                  <TinyLabel
                    style={{ color: active ? "white" : theme.mutedForeground }}
                    className="normal-case tracking-normal"
                  >
                    {label}
                  </TinyLabel>
                  {
                    <TinyLabel
                      style={{
                        color: active
                          ? "rgba(40, 40, 40, 0.7)"
                          : theme.mutedForeground,
                        fontSize: 9,
                      }}
                    >
                      {count}
                    </TinyLabel>
                  }
                </Pressable>
              );
            })}
          </View>

          {/* ── Library tab ── */}
          {activeTab === "library" && (
            <View>
              {ownedItemsLoading ? (
                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                  <ActivityIndicator color={THEME.light.primary} />
                </View>
              ) : ownedItems.length === 0 ? (
                <EmptyState
                  icon={<Package size={40} color={theme.mutedForeground} />}
                  message={`${firstName} hasn't added any items yet`}
                />
              ) : (
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}
                >
                  {ownedItems.map((item) => {
                    const borrowedByMe =
                      !!user &&
                      item.borrowedBy === user.id &&
                      !!item.borrowedDate &&
                      !item.returnedDate;
                    return (
                      <ItemCard
                        key={item.id}
                        item={item}
                        request={borrowRequests.get(item.id)}
                        isRequesting={requestingItemId === item.id}
                        isBorrowedByMe={borrowedByMe}
                        onPress={() => router.push(`/item/${item.id}` as any)}
                        onBorrow={
                          borrowedByMe
                            ? undefined
                            : () => handleRequestBorrow(item)
                        }
                        onCancel={
                          borrowedByMe
                            ? undefined
                            : () => handleCancelRequest(item)
                        }
                        onReturn={
                          borrowedByMe ? () => handleReturn(item) : undefined
                        }
                      />
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* ── Borrowing tab ── */}
          {activeTab === "borrowing" && (
            <View style={{ gap: 12 }}>
              {activeItems.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 size={40} color={THEME.light.primary} />}
                  message={`${firstName} doesn't have any of your items right now`}
                />
              ) : (
                activeItems.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(`/item/${item.id}` as any)}
                    style={({ pressed }) => ({
                      backgroundColor: theme.card,
                      borderRadius: 24,
                      padding: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderWidth: 1,
                      borderColor: theme.border,
                      opacity: pressed ? 0.7 : 1,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.04,
                      shadowRadius: 4,
                      elevation: 2,
                    })}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          backgroundColor: THEME.light.secondary + "18",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Clock size={20} color={THEME.light.secondary} />
                      </View>
                      <View>
                        <BodyStrong numberOfLines={1}>{item.name}</BodyStrong>
                        <Caption style={{ marginTop: 2 }}>
                          {item.dueDate
                            ? `Due ${item.dueDate.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`
                            : "No due date set"}
                        </Caption>
                      </View>
                    </View>
                    <TinyLabel
                      className="normal-case tracking-normal"
                      style={{ color: THEME.light.secondary }}
                    >
                      Active
                    </TinyLabel>
                  </Pressable>
                ))
              )}
            </View>
          )}

          {/* ── History tab ── */}
          {activeTab === "history" && (
            <View style={{ gap: 12 }}>
              {returnedItems.length === 0 ? (
                <EmptyState
                  icon={<History size={40} color={theme.mutedForeground} />}
                  message="No borrowing history yet"
                />
              ) : (
                returnedItems.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(`/item/${item.id}` as any)}
                    style={({ pressed }) => ({
                      backgroundColor: theme.card,
                      borderRadius: 24,
                      padding: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderWidth: 1,
                      borderColor: theme.border,
                      opacity: pressed ? 0.6 : 0.75,
                    })}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          backgroundColor: isDark ? theme.muted : "#F3F4F6",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <History size={20} color={theme.mutedForeground} />
                      </View>
                      <View>
                        <BodyStrong numberOfLines={1}>{item.name}</BodyStrong>
                        <Caption style={{ marginTop: 2 }}>
                          {item.returnedDate
                            ? `Returned ${item.returnedDate.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`
                            : "Returned"}
                        </Caption>
                      </View>
                    </View>
                    <TinyLabel className="normal-case tracking-normal">
                      Done
                    </TinyLabel>
                  </Pressable>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Small helper ──────────────────────────────────────────────────────────────
function EmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;
  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 24,
        padding: 32,
        alignItems: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      {icon}
      <Caption className="text-center">{message}</Caption>
    </View>
  );
}
