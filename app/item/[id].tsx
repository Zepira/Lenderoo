import { useState, useEffect, useMemo, useCallback } from "react";
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
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  Keyboard,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  ChevronRight,
  Clock,
  Edit,
  EyeOff,
  Heart,
  Package,
  RotateCcw,
  Send,
  Tag,
  Trash2,
  User,
  UserCircle,
  Users,
  BookOpen,
  X,
} from "lucide-react-native";
import { ErrorState } from "@/components/ErrorState";
import {
  useItem,
  useDeleteItem,
  useInitiateReturn,
  useConfirmHandoff,
  useUpdateItem,
  useFriendsItems,
} from "hooks/useItems";
import { useUserProfile, useFriends } from "hooks/useFriends";
import { CATEGORY_CONFIG } from "@/lib/category-config";
import {
  formatDate,
  formatRelativeTime,
  daysUntilDue,
  daysBorrowed,
  getInitials,
  calculateItemStatus,
  toProperCase,
  formatMaxBorrowDuration,
  itemGroupKey,
} from "lib/utils";
import { getItemAction } from "lib/item-actions";
import {
  createBorrowRequest,
  getMyBorrowRequestForItem,
  cancelBorrowRequest,
  getApprovedQueueForItem,
} from "@/lib/services/borrow-requests";
import { getHistoryForItemWithUsers } from "@/lib/services/database";
import { isItemFavourited, setItemFavourite } from "@/lib/services/favourites";
import {
  subscribeToItemAvailability,
  unsubscribeFromItemAvailability,
  getMyAvailabilitySubscriptionForItem,
} from "@/lib/services/availability";
import type {
  BorrowRequest,
  BorrowHistoryWithUser,
  BorrowRequestWithDetails,
  ItemAvailabilitySubscription,
} from "lib/types";
import * as toast from "@/lib/toast";
import { supabase } from "@/lib/supabase";
import { subscribeLogged } from "@/lib/realtime";
import { resolveAvatarSource } from "@/lib/services/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import {
  PageHero,
  SectionHeading,
  BodyStrong,
  BodyText,
  Caption,
  TinyLabel,
  LabelStrong,
} from "@/components/ui/typography";
import type { ItemStatus, BookMetadata } from "lib/types";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user, appUser } = useAuth();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;
  const insets = useSafeAreaInsets();
  const { item, loading, error, refresh } = useItem(id!);

  const isBorrower =
    item &&
    user &&
    item.borrowedBy === user.id &&
    !!item.borrowedDate &&
    !item.returnedDate;
  const isOwner = item && user && item.userId === user.id;
  // Load the borrower's public profile for display purposes.
  // Guard against querying our own ID (stale data where isBorrower would be false).
  const borrowerUserId =
    item?.borrowedBy &&
    item.borrowedBy !== user?.id &&
    !item.returnedDate &&
    !isBorrower
      ? item.borrowedBy
      : null;
  const { profile: borrowerProfile } = useUserProfile(borrowerUserId);

  // Pending handoff (pickup or return) — who must confirm before it's real.
  const isPendingRecipient = !!item && !!user && item.pendingRecipientId === user.id;
  const isPendingElsewhere =
    !!item && !!item.pendingRecipientId && !isPendingRecipient;
  const pendingIsReturn = !!item && item.pendingRecipientId === item.userId;
  const pendingRecipientUserId =
    isPendingElsewhere && item?.pendingRecipientId ? item.pendingRecipientId : null;
  const { profile: pendingRecipientProfile } = useUserProfile(
    pendingRecipientUserId,
  );

  const { deleteItem, loading: deleting } = useDeleteItem();
  const { initiateReturn, loading: returning } = useInitiateReturn();
  const { confirmHandoff, loading: confirming } = useConfirmHandoff();
  const { updateItem, loading: lending } = useUpdateItem();
  const { items: friendsItems } = useFriendsItems();
  const { friends } = useFriends();

  // Owner name: "Me" if current user owns it, otherwise look up in friends list
  const ownerFriend = friends.find((f) => f.id === item?.userId);
  const ownerName = isOwner ? "Me" : (ownerFriend?.name ?? "Unknown");

  // Lend-to modal state (owner)
  const [lendPickerOpen, setLendPickerOpen] = useState(false);
  const [lendSearch, setLendSearch] = useState("");
  // Manual keyboard tracking instead of KeyboardAvoidingView — RN's Modal
  // renders as a separate native Android Dialog window that doesn't
  // reliably inherit windowSoftInputMode, so KeyboardAvoidingView silently
  // fails to shift this sheet above the keyboard on Android (works fine on
  // iOS, easy to miss in testing). This sheet also can't switch to
  // KeyboardAwareScrollView like other forms do, since its content is a
  // FlatList — nesting a VirtualizedList inside a ScrollView isn't safe.
  const [lendPickerKeyboardHeight, setLendPickerKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) =>
      setLendPickerKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setLendPickerKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Borrow request state (for friend-viewer actions)
  const [borrowRequest, setBorrowRequest] = useState<BorrowRequest | null>(
    null,
  );
  const [requesting, setRequesting] = useState(false);

  // Borrow history
  const [borrowHistory, setBorrowHistory] = useState<BorrowHistoryWithUser[]>(
    [],
  );
  // Approved queue entries (people waiting to borrow next)
  const [borrowQueue, setBorrowQueue] = useState<BorrowRequestWithDetails[]>(
    [],
  );

  // "Notify when available" subscription (for friend-viewer actions)
  const [availabilitySub, setAvailabilitySub] =
    useState<ItemAvailabilitySubscription | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  // Current viewer's favourite status for this item
  const [isFavourite, setIsFavourite] = useState(false);

  const loadFavourite = useCallback(async () => {
    if (!item) return;
    try {
      setIsFavourite(await isItemFavourited(item.id));
    } catch {}
  }, [item?.id]);

  const loadBorrowRequest = useCallback(async () => {
    if (!item || isOwner || isBorrower) return;
    try {
      const req = await getMyBorrowRequestForItem(item.id);
      setBorrowRequest(req);
    } catch {}
  }, [item?.id, isOwner, isBorrower]);

  const loadBorrowHistory = useCallback(async () => {
    if (!item) return;
    try {
      const history = await getHistoryForItemWithUsers(item.id);
      setBorrowHistory(history);
    } catch {}
  }, [item?.id]);

  const loadBorrowQueue = useCallback(async () => {
    if (!item?.borrowedBy) {
      setBorrowQueue([]);
      return;
    }
    try {
      const queue = await getApprovedQueueForItem(item.id, item.borrowedBy);
      setBorrowQueue(queue);
    } catch {}
  }, [item?.id, item?.borrowedBy]);

  const loadAvailabilitySubscription = useCallback(async () => {
    if (!item || isOwner) {
      setAvailabilitySub(null);
      return;
    }
    try {
      const sub = await getMyAvailabilitySubscriptionForItem(item.id);
      setAvailabilitySub(sub);
    } catch {}
  }, [item?.id, isOwner]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      loadBorrowRequest();
      loadBorrowHistory();
      loadBorrowQueue();
      loadAvailabilitySubscription();
      loadFavourite();
    }, [
      refresh,
      loadBorrowRequest,
      loadBorrowHistory,
      loadBorrowQueue,
      loadAvailabilitySubscription,
      loadFavourite,
    ]),
  );

  // Live-update borrow request status (e.g. owner approves while this screen is open)
  useEffect(() => {
    if (!item?.id || isOwner) return;
    const channel = subscribeLogged(
      supabase
        .channel(`item-${item.id}-requests`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "borrow_requests",
            filter: `item_id=eq.${item.id}`,
          },
          () => {
            loadBorrowRequest();
            loadBorrowQueue();
            refresh();
          },
        ),
      `item-${item.id}-requests`,
    );
    return () => {
      supabase.removeChannel(channel);
    };
  }, [item?.id, isOwner, loadBorrowRequest, loadBorrowQueue, refresh]);

  // Other friends who own a matching item (same book, same-name generic
  // item, etc. — see itemGroupKey), so the viewer can pick who to borrow
  // from instead of only ever seeing the one copy they navigated in on.
  const otherCopies = useMemo(() => {
    if (!item) return [];
    const key = itemGroupKey(item);
    return friendsItems
      .filter((otherItem) => otherItem.id !== item.id && itemGroupKey(otherItem) === key)
      .map((otherItem) => ({
        item: otherItem,
        owner: friends.find((f) => f.id === otherItem.userId) ?? null,
      }))
      .filter((o) => o.owner !== null);
  }, [item, friendsItems, friends]);

  const goBack = () =>
    navigation.canGoBack() ? router.back() : router.push("/(tabs)" as any);

  const handleBorrow = async () => {
    if (!item) return;
    try {
      setRequesting(true);
      await createBorrowRequest(item.id, item.userId);
      toast.success("Borrow request sent!");
      await loadBorrowRequest();
    } catch (e: any) {
      toast.error(e?.message || "Failed to send request");
    } finally {
      setRequesting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!borrowRequest) return;
    try {
      setRequesting(true);
      await cancelBorrowRequest(borrowRequest.id);
      toast.success("Request cancelled");
      setBorrowRequest(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to cancel request");
    } finally {
      setRequesting(false);
    }
  };

  const handleToggleUnavailable = async () => {
    if (!item) return;
    const nextUnavailable = !item.isUnavailable;
    try {
      await updateItem(item.id, { isUnavailable: nextUnavailable });
      toast.success(
        nextUnavailable ? "Item marked unavailable" : "Item marked available",
      );
      refresh();
    } catch {
      toast.error("Failed to update availability");
    }
  };

  const handleToggleFavourite = async () => {
    if (!item) return;
    const next = !isFavourite;
    setIsFavourite(next);
    try {
      await setItemFavourite(item.id, next);
    } catch {
      setIsFavourite(!next);
      toast.error("Failed to update favourite");
    }
  };

  const handleToggleNotify = async () => {
    if (!item) return;
    setSubscribing(true);
    try {
      if (availabilitySub) {
        await unsubscribeFromItemAvailability(availabilitySub.id);
        setAvailabilitySub(null);
        toast.success("Notification cancelled");
      } else {
        const sub = await subscribeToItemAvailability(item.id);
        setAvailabilitySub(sub);
        toast.success("We'll notify you when it's available");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to update notification");
    } finally {
      setSubscribing(false);
    }
  };

  const isLoading = loading || (!item && !error);

  if (isLoading || error || !item) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <View
          style={{
            position: "absolute",
            top: insets.top + 12,
            left: 20,
            zIndex: 10,
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: isDark ? theme.muted : "#F3F4F6",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Pressable
            onPress={goBack}
            style={({ pressed }) => ({
              flex: 1,
              width: "100%",
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <ArrowLeft size={22} color={theme.foreground} />
          </Pressable>
        </View>
        {isLoading ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Caption>Loading…</Caption>
          </View>
        ) : (
          <ErrorState
            message={
              error
                ? "Couldn't load this item. Please try again."
                : "Item not found."
            }
            onRetry={error ? refresh : undefined}
          />
        )}
      </View>
    );
  }

  const status: ItemStatus = calculateItemStatus(item);
  // Same decision function ItemCard uses — guarantees the two surfaces
  // never disagree on what the primary action should be.
  const action = getItemAction(item, user?.id, borrowRequest);
  const isAvailable = status === "available";
  const isOverdue = status === "overdue";
  const daysUntil = item.dueDate ? daysUntilDue(item.dueDate) : undefined;
  const daysSinceBorrowed = item.borrowedDate
    ? daysBorrowed(item.borrowedDate, item.returnedDate)
    : 0;

  const cfg = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.other;
  const imageUrl =
    item.images?.[0] ?? (item as any).imageUrls?.[0] ?? (item as any).imageUrl;
  const bookMeta =
    item.category === "book" ? (item.metadata as BookMetadata) : null;
  const maxBorrowDurationLabel = formatMaxBorrowDuration(item.maxBorrowDays);
  const condition = (bookMeta?.condition ??
    (item.metadata as any)?.condition) as
    | "fair"
    | "good"
    | "perfect"
    | undefined;

  const CONDITION_COLOR = {
    fair: "#F59E0B",
    good: "#10B981",
    perfect: "#3B82F6",
  } as const;

  const isMarkedUnavailable = isAvailable && !!item.isUnavailable;
  const statusLabel = isMarkedUnavailable
    ? "Unavailable"
    : isAvailable
      ? "Available"
      : isOverdue
        ? "Overdue"
        : "Lent Out";
  const statusColor = isMarkedUnavailable
    ? theme.mutedForeground
    : isAvailable
      ? theme.primary
      : isOverdue
        ? theme.destructive
        : theme.secondary;

  // Borrower-only: initiates a return. If someone's queued up next, the
  // borrower can hand off directly to them instead of routing through the
  // owner — either way, the recipient must confirm before it's final.
  const handleMarkReturned = async () => {
    if (!item) return;

    const finish = async (recipientId?: string) => {
      try {
        await initiateReturn(item.id, recipientId);
        toast.success("Waiting for confirmation…");
        router.back();
      } catch (e: any) {
        toast.error(e?.message || "Failed to initiate return");
      }
    };

    if (borrowQueue.length > 0) {
      const next = borrowQueue[0];
      Alert.alert(
        "Return Item",
        `${next.requesterName} is waiting to borrow "${item.name}". How would you like to return it?`,
        [
          {
            text: `Hand off to ${next.requesterName}`,
            onPress: () => finish(next.requesterId),
          },
          { text: "Return to Owner", onPress: () => finish(item.userId) },
          { text: "Cancel", style: "cancel" },
        ],
      );
      return;
    }

    await finish();
  };

  // Owner or next-in-queue confirming a pending pickup/return.
  const handleConfirmHandoff = async () => {
    if (!item) return;
    try {
      await confirmHandoff(item.id);
      toast.success(pendingIsReturn ? "Return confirmed" : "Pickup confirmed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to confirm");
    }
  };

  const handleEdit = () => {
    router.push(`/edit-item/${item.id}` as any);
  };

  const handleLendTo = async (friendId: string) => {
    setLendPickerOpen(false);
    try {
      await updateItem(item.id, {
        pendingRecipientId: friendId,
        pendingSince: new Date(),
      });
      const friendName =
        friends.find((f) => f.id === friendId)?.name ?? "friend";
      toast.success(`Waiting for ${friendName} to confirm pickup`);
      refresh();
    } catch {
      toast.error("Failed to lend item");
    }
  };

  const handleDelete = async () => {
    const confirmed =
      Platform.OS === "web"
        ? window.confirm(
            `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
          )
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              "Delete Item",
              `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => resolve(true),
                },
              ],
            );
          });

    if (!confirmed) return;

    try {
      await deleteItem(item.id);
      toast.success(`"${item.name}" has been deleted`);
      router.back();
    } catch {
      toast.error("Failed to delete item");
    }
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#ffffff" }}
    >
      {/* Back button — absolutely positioned, clears status bar via insets */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: 20,
          zIndex: 10,
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: isDark ? theme.muted : "#F3F4F6",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Pressable
          onPress={goBack}
          style={({ pressed }) => ({
            flex: 1,
            width: "100%",
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <ArrowLeft size={22} color={theme.foreground} />
        </Pressable>
      </View>

      {/* Favourite heart — mirrors back button */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 12,
          right: 20,
          zIndex: 10,
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: isDark ? theme.muted : "#F3F4F6",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Pressable
          onPress={handleToggleFavourite}
          style={({ pressed }) => ({
            flex: 1,
            width: "100%",
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Heart
            size={20}
            color={isFavourite ? theme.destructive : theme.foreground}
            fill={isFavourite ? theme.destructive : "transparent"}
          />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {/* ── Hero Image ── */}
        <View style={{ height: 400, width: "100%" }}>
          {imageUrl ? (
            <View>
              <Image
                source={{ uri: imageUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
              <LinearGradient
                // Array of colors showing the progression from top to bottom
                colors={[
                  "rgba(0, 0, 0, 0.07)",
                  "rgba(0, 0, 0, 0.53)",
                  "rgba(0, 0, 0, 0.64)",
                  "#000000cb",
                ]}
                // Explicit alignment points (Optional: This is the default vertical setup)
                start={{ x: 0, y: 0 }} // Top
                end={{ x: 0, y: 1 }} // Bottom
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
            </View>
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: cfg.color + "22",
              }}
            >
              <cfg.Icon size={80} color={cfg.color} />
            </View>
          )}

          {/* Gradient overlay */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.65)"]}
            locations={[0.35, 1]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />

          {/* Floating info */}
          <View
            style={{
              position: "absolute",
              bottom: 48,
              left: 20,
              right: 20,
            }}
          >
            {/* Badges */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  backgroundColor: cfg.color + "EE",
                  borderRadius: 8,
                }}
              >
                <TinyLabel
                  style={{ color: "#fff" }}
                  className="normal-case tracking-normal"
                >
                  {toProperCase(item.category)}
                </TinyLabel>
              </View>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  backgroundColor: statusColor + "EE",
                  borderRadius: 8,
                }}
              >
                <TinyLabel
                  style={{ color: "#fff" }}
                  className="normal-case tracking-normal"
                >
                  {statusLabel}
                </TinyLabel>
              </View>
            </View>

            {/* Item name */}
            <PageHero
              style={{ color: "#fff", lineHeight: 40 }}
              numberOfLines={2}
            >
              {item.name}
            </PageHero>

            {/* Author (books) */}
            {bookMeta?.author && (
              <Caption style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
                by {bookMeta.author}
              </Caption>
            )}
          </View>
        </View>

        {/* ── Content card ── */}
        <View
          style={{
            backgroundColor: theme.card,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            marginTop: -38,
            paddingTop: 44,
            paddingHorizontal: 24,
            paddingBottom: 8,
          }}
        >
          {/* ── Quick stats row ── */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              paddingBottom: 24,
              marginBottom: 24,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            {/* Owner */}
            <View style={{ alignItems: "center", flex: 1 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                {!isOwner && (
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      overflow: "hidden",
                      backgroundColor: theme.primary + "22",
                    }}
                  >
                    {resolveAvatarSource(ownerFriend?.avatarUrl) ? (
                      <Image
                        source={resolveAvatarSource(ownerFriend!.avatarUrl)!}
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
                        <Caption style={{ color: theme.primary }}>
                          {getInitials(ownerName)}
                        </Caption>
                      </View>
                    )}
                  </View>
                )}
                <View style={{ alignItems: "center" }}>
                  <TinyLabel style={{ marginBottom: 4 }}>Owner</TinyLabel>
                  <LabelStrong numberOfLines={1}>{ownerName}</LabelStrong>
                </View>
              </View>
            </View>

            <View style={{ width: 1, backgroundColor: theme.border }} />

            {/* Condition */}
            <View style={{ alignItems: "center", flex: 1 }}>
              <TinyLabel style={{ marginBottom: 4 }}>Condition</TinyLabel>
              <LabelStrong
                style={{
                  color: condition
                    ? CONDITION_COLOR[condition]
                    : theme.foreground,
                }}
                numberOfLines={1}
              >
                {condition
                  ? condition.charAt(0).toUpperCase() + condition.slice(1)
                  : "—"}
              </LabelStrong>
            </View>

            <View style={{ width: 1, backgroundColor: theme.border }} />

            {/* Duration */}
            <View style={{ alignItems: "center", flex: 1 }}>
              <TinyLabel style={{ marginBottom: 4 }}>Duration</TinyLabel>
              <LabelStrong numberOfLines={1} style={{ maxWidth: 90 }}>
                {maxBorrowDurationLabel
                  ? maxBorrowDurationLabel
                  : daysSinceBorrowed > 0
                    ? `${daysSinceBorrowed}d`
                    : "—"}
              </LabelStrong>
            </View>
          </View>

          {/* ── Description ── */}
          {item.description && !bookMeta && (
            <>
              <BodyText
                style={{
                  color: theme.mutedForeground,
                  marginBottom: 24,
                  lineHeight: 22,
                }}
              >
                {item.description}
              </BodyText>
            </>
          )}

          {/* ── Book metadata ── */}

          {bookMeta && (
            <View style={{ gap: 20, marginBottom: 24 }}>
              {/* Rating */}
              {bookMeta.averageRating && (
                <View>
                  <TinyLabel style={{ marginBottom: 6 }}>Rating</TinyLabel>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <BodyText style={{ letterSpacing: 2, color: "#F59E0B" }}>
                      {"★".repeat(Math.round(bookMeta.averageRating))}
                      {"☆".repeat(5 - Math.round(bookMeta.averageRating))}
                    </BodyText>
                    <Caption style={{ color: theme.mutedForeground }}>
                      {bookMeta.averageRating.toFixed(1)}
                    </Caption>
                  </View>
                </View>
              )}
              {/* Genre — full width, wrapping */}
              {bookMeta.genre && (
                <View>
                  <TinyLabel style={{ marginBottom: 6 }}>Genre</TinyLabel>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                  >
                    {(Array.isArray(bookMeta.genre)
                      ? bookMeta.genre
                      : String(bookMeta.genre).split(",")
                    ).map((g: string, i: number) => (
                      <View
                        key={i}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          backgroundColor: theme.primary + "18",
                          borderRadius: 8,
                        }}
                      >
                        <Caption style={{ color: theme.primary }}>
                          {g.trim()}
                        </Caption>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Series */}
              {bookMeta.seriesName && (
                <View>
                  <TinyLabel style={{ marginBottom: 6 }}>Series</TinyLabel>
                  <BodyText>
                    {bookMeta.seriesName}
                    {bookMeta.seriesNumber ? ` #${bookMeta.seriesNumber}` : ""}
                  </BodyText>
                </View>
              )}

              {/* Publication info */}
              {(bookMeta.publicationYear || bookMeta.pageCount) && (
                <View style={{ flexDirection: "row", gap: 24 }}>
                  {bookMeta.publicationYear && (
                    <View style={{ flex: 1 }}>
                      <TinyLabel style={{ marginBottom: 4 }}>
                        Published
                      </TinyLabel>
                      <BodyText>{bookMeta.publicationYear}</BodyText>
                    </View>
                  )}
                  {bookMeta.pageCount && (
                    <View style={{ flex: 1 }}>
                      <TinyLabel style={{ marginBottom: 4 }}>Pages</TinyLabel>
                      <BodyText>{bookMeta.pageCount}</BodyText>
                    </View>
                  )}
                </View>
              )}

              {/* Synopsis */}
              {bookMeta.synopsis && (
                <View>
                  <TinyLabel style={{ marginBottom: 8 }}>Synopsis</TinyLabel>
                  <BodyText
                    style={{ color: theme.mutedForeground, lineHeight: 22 }}
                  >
                    {bookMeta.synopsis}
                  </BodyText>
                </View>
              )}
            </View>
          )}

          {/* ── Pending pickup banner ── item approved/lent but not yet confirmed ── */}
          {status === "requested" && isPendingElsewhere && (
            <>
              <Separator style={{ marginBottom: 20 }} />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  padding: 16,
                  backgroundColor: theme.primary + "18",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: theme.primary + "33",
                  marginBottom: 24,
                }}
              >
                <Clock size={22} color={theme.primary} />
                <View style={{ flex: 1 }}>
                  <TinyLabel style={{ marginBottom: 2 }}>
                    Pending Pickup
                  </TinyLabel>
                  <BodyStrong>
                    Waiting for {pendingRecipientProfile?.name ?? "them"} to
                    confirm
                  </BodyStrong>
                </View>
              </View>
            </>
          )}

          {/* ── Lent-out info panel ── always shown when item is lent out ── */}
          {!isAvailable && item.borrowedBy && (
            <>
              <Separator style={{ marginBottom: 20 }} />
              {/* Pending return banner — current holder already initiated the
                  return/hand-off, shown to everyone except the recipient. */}
              {isPendingElsewhere && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    padding: 16,
                    backgroundColor: theme.primary + "18",
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: theme.primary + "33",
                    marginBottom: 16,
                  }}
                >
                  <Clock size={22} color={theme.primary} />
                  <View style={{ flex: 1 }}>
                    <TinyLabel style={{ marginBottom: 2 }}>
                      Return Pending
                    </TinyLabel>
                    <BodyStrong>
                      Waiting for {pendingRecipientProfile?.name ?? "them"} to
                      confirm
                    </BodyStrong>
                  </View>
                </View>
              )}
              {isBorrower ? (
                // Viewer is the borrower — show "You" panel
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    padding: 16,
                    backgroundColor: theme.secondary + "18",
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: theme.secondary + "33",
                    marginBottom: 24,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      overflow: "hidden",
                      backgroundColor: theme.secondary + "22",
                    }}
                  >
                    {resolveAvatarSource(appUser?.avatarUrl) ? (
                      <Image
                        source={resolveAvatarSource(appUser!.avatarUrl)!}
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
                        <BodyStrong style={{ color: theme.secondary }}>
                          {getInitials(appUser?.name)}
                        </BodyStrong>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <TinyLabel style={{ marginBottom: 2 }}>
                      Currently Lent To
                    </TinyLabel>
                    <BodyStrong>You</BodyStrong>
                  </View>
                </View>
              ) : borrowerProfile ? (
                // Show borrower — tappable link only if they're also a friend
                (() => {
                  const borrowerIsFriend = friends.some(
                    (f) => f.id === borrowerUserId,
                  );
                  const inner = (
                    <>
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          overflow: "hidden",
                          backgroundColor: theme.secondary + "22",
                        }}
                      >
                        {resolveAvatarSource(borrowerProfile.avatarUrl) ? (
                          <Image
                            source={
                              resolveAvatarSource(borrowerProfile.avatarUrl)!
                            }
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
                            <BodyStrong style={{ color: theme.secondary }}>
                              {getInitials(borrowerProfile.name)}
                            </BodyStrong>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <TinyLabel style={{ marginBottom: 2 }}>
                          Currently Lent To
                        </TinyLabel>
                        <BodyStrong>{borrowerProfile.name}</BodyStrong>
                      </View>
                      {borrowerIsFriend && (
                        <ChevronRight size={18} color={theme.mutedForeground} />
                      )}
                    </>
                  );
                  const containerStyle = {
                    flexDirection: "row" as const,
                    alignItems: "center" as const,
                    gap: 14,
                    padding: 16,
                    backgroundColor: theme.secondary + "18",
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: theme.secondary + "33",
                    marginBottom: 24,
                  };
                  return borrowerIsFriend ? (
                    <TouchableOpacity
                      onPress={() =>
                        router.push(`/friends/${borrowerProfile.id}` as any)
                      }
                      style={containerStyle}
                      activeOpacity={0.75}
                    >
                      {inner}
                    </TouchableOpacity>
                  ) : (
                    <View style={containerStyle}>{inner}</View>
                  );
                })()
              ) : null}

              {/* ── Borrow Queue (approved next borrowers) ── */}
              {borrowQueue.length > 0 && (
                <View style={{ gap: 8, marginBottom: 12 }}>
                  {borrowQueue.map((req, index) => (
                    <View
                      key={req.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 14,
                        padding: 16,
                        backgroundColor: theme.primary + "10",
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: theme.primary + "28",
                      }}
                    >
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          overflow: "hidden",
                          backgroundColor: theme.primary + "22",
                        }}
                      >
                        {resolveAvatarSource(req.requesterAvatarUrl) ? (
                          <Image
                            source={resolveAvatarSource(req.requesterAvatarUrl)!}
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
                            <BodyStrong style={{ color: theme.primary }}>
                              {getInitials(req.requesterName)}
                            </BodyStrong>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <TinyLabel style={{ marginBottom: 2 }}>
                          {borrowQueue.length > 1
                            ? `Borrowing Next (#${index + 1})`
                            : "Borrowing Next"}
                        </TinyLabel>
                        <BodyStrong>{req.requesterName}</BodyStrong>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {/* ── Borrow History ── */}
          {(() => {
            // Synthesize an "Active" row from the item's live state so we never
            // rely on an open DB entry. DB entries are only written at return
            // time (complete records), so they are always "Returned".
            const activeName = isBorrower
              ? (appUser?.name ?? "You")
              : (borrowerProfile?.name ?? null);
            const activeAvatar = isBorrower
              ? (appUser?.avatarUrl ?? null)
              : (borrowerProfile?.avatarUrl ?? null);
            const showActiveRow = !isAvailable && !!item.borrowedDate;
            const totalCount = borrowHistory.length + (showActiveRow ? 1 : 0);
            if (totalCount === 0) return null;

            const renderRow = (
              key: string,
              displayName: string,
              avatarUrl: string | null | undefined,
              borrowedDate: Date,
              returnedDate: Date | undefined,
              active: boolean,
            ) => {
              const avatarSrc = avatarUrl
                ? resolveAvatarSource(avatarUrl)
                : null;
              return (
                <View
                  key={key}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    backgroundColor: active
                      ? theme.secondary + "12"
                      : theme.muted,
                    borderRadius: 16,
                    borderWidth: active ? 1 : 0,
                    borderColor: active
                      ? theme.secondary + "33"
                      : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      overflow: "hidden",
                      backgroundColor: theme.primary + "22",
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
                        <Caption style={{ color: theme.primary }}>
                          {getInitials(displayName)}
                        </Caption>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <BodyStrong style={{ fontSize: 13 }}>
                      {displayName}
                    </BodyStrong>
                    <Caption>
                      {formatDate(borrowedDate)}
                      {returnedDate ? ` → ${formatDate(returnedDate)}` : ""}
                    </Caption>
                  </View>

                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      backgroundColor: active
                        ? theme.secondary + "EE"
                        : theme.primary + "22",
                      borderRadius: 8,
                    }}
                  >
                    <TinyLabel
                      style={{ color: active ? "#fff" : theme.primary }}
                      className="normal-case tracking-normal"
                    >
                      {active ? "Active" : "Returned"}
                    </TinyLabel>
                  </View>
                </View>
              );
            };

            return (
              <>
                <Separator style={{ marginBottom: 20 }} />
                <SectionHeading style={{ marginBottom: 4 }}>
                  Borrow History
                </SectionHeading>
                <Caption style={{ marginBottom: 16 }}>
                  {totalCount} time{totalCount !== 1 ? "s" : ""} borrowed
                </Caption>
                <View style={{ gap: 10, marginBottom: 24 }}>
                  {showActiveRow &&
                    activeName &&
                    renderRow(
                      "active",
                      activeName,
                      activeAvatar,
                      item.borrowedDate!,
                      undefined,
                      true,
                    )}
                  {borrowHistory.map((entry) =>
                    renderRow(
                      entry.id,
                      entry.borrowerName ?? "Unknown",
                      entry.borrowerAvatarUrl,
                      entry.borrowedDate,
                      entry.returnedDate,
                      false,
                    ),
                  )}
                </View>
              </>
            );
          })()}

          {/* ── Notes ── */}
          {item.notes && (
            <>
              <Separator style={{ marginBottom: 20 }} />
              <SectionHeading style={{ marginBottom: 12 }}>
                Notes
              </SectionHeading>
              <View
                style={{
                  backgroundColor: theme.muted,
                  borderRadius: 16,
                  padding: 16,
                  borderLeftWidth: 3,
                  borderLeftColor: theme.primary,
                  marginBottom: 24,
                }}
              >
                <BodyText style={{ color: theme.mutedForeground }}>
                  {item.notes}
                </BodyText>
              </View>
            </>
          )}

          {/* ── Other owners of this item ── */}
          {!isBorrower && !isOwner && otherCopies.length > 0 && (
            <>
              <Separator style={{ marginBottom: 20 }} />
              <SectionHeading style={{ marginBottom: 4 }}>
                Also Owned By
              </SectionHeading>
              <Caption style={{ marginBottom: 16 }}>
                {otherCopies.length}{" "}
                {otherCopies.length === 1 ? "other friend" : "other friends"}{" "}
                {otherCopies.length === 1 ? "has" : "have"} this too — tap to
                borrow from them instead
              </Caption>
              <View style={{ gap: 10, marginBottom: 24 }}>
                {otherCopies.map(({ item: otherItem, owner }) => {
                  const otherAvailable =
                    !otherItem.borrowedBy && !otherItem.returnedDate && !otherItem.isUnavailable;
                  return (
                    <Pressable
                      key={otherItem.id}
                      onPress={() => router.push(`/item/${otherItem.id}` as any)}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        padding: 14,
                        backgroundColor: theme.muted,
                        borderRadius: 16,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          overflow: "hidden",
                          backgroundColor: theme.primary + "22",
                        }}
                      >
                        {resolveAvatarSource(owner?.avatarUrl) ? (
                          <Image
                            source={resolveAvatarSource(owner!.avatarUrl)!}
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
                            <Caption style={{ color: theme.primary }}>
                              {owner ? getInitials(owner.name) : "?"}
                            </Caption>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <BodyStrong style={{ fontSize: 13 }}>
                          {owner?.name ?? "Unknown"}
                        </BodyStrong>
                        <Caption
                          style={{ color: otherAvailable ? theme.primary : theme.secondary }}
                        >
                          {otherAvailable ? "Available" : "Currently lent out"}
                        </Caption>
                      </View>
                      <View style={{ width: 18, height: 40, alignItems: "center", justifyContent: "center" }}>
                        <ChevronRight size={18} color={theme.mutedForeground} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* ── Meta ── */}
          <Separator style={{ marginBottom: 16 }} />
          <Caption style={{ marginBottom: 4 }}>
            Added {formatRelativeTime(item.createdAt)}
          </Caption>
          {item.createdAt.getTime() !== item.updatedAt.getTime() && (
            <Caption>Updated {formatRelativeTime(item.updatedAt)}</Caption>
          )}

          {/* ── Action Buttons ── */}
          <View style={{ gap: 12, marginTop: 28 }}>
            {isBorrower ? (
              action.kind === "markReturned" ? (
                /* Viewer is the borrower — secondary yellow, matches ItemCard "Return" */
                <Button
                  variant="secondary"
                  onPress={handleMarkReturned}
                  disabled={returning}
                >
                  <RotateCcw size={18} color={theme.secondaryForeground} />
                  <Text>{returning ? "Returning…" : action.label}</Text>
                </Button>
              ) : (
                /* Already initiated a return/hand-off — waiting on the
                   recipient to confirm. Nothing left for the borrower to do. */
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 14,
                  }}
                >
                  <Clock size={16} color={theme.mutedForeground} />
                  <Caption>
                    Waiting for {pendingRecipientProfile?.name ?? "them"} to
                    confirm
                  </Caption>
                </View>
              )
            ) : isOwner ? (
              /* Viewer is the owner — owner management actions. The owner can
                 never unilaterally mark an item returned; they can only
                 confirm a return the borrower already initiated. */
              <>
                {action.kind === "confirmReturn" && (
                  <Button onPress={handleConfirmHandoff} disabled={confirming}>
                    <Check size={18} color="#fff" />
                    <Text>{confirming ? "Confirming…" : action.label}</Text>
                  </Button>
                )}

                {isPendingElsewhere && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      paddingVertical: 14,
                    }}
                  >
                    <Clock size={16} color={theme.mutedForeground} />
                    <Caption>
                      Waiting for {pendingRecipientProfile?.name ?? "them"} to
                      confirm pickup
                    </Caption>
                  </View>
                )}

                {/* Lend to — only when available and not marked unavailable */}
                {isAvailable && !isMarkedUnavailable && (
                  <Button
                    onPress={() => {
                      setLendPickerOpen(true);
                      setLendSearch("");
                    }}
                    disabled={lending || friends.length === 0}
                  >
                    <Users size={16} color="#fff" />
                    <Text>
                      {friends.length === 0 ? "No friends yet" : "Lend to…"}
                    </Text>
                  </Button>
                )}

                {/* Mark unavailable / available — only while not lent out */}
                {isAvailable && (
                  <Button
                    variant={isMarkedUnavailable ? "default" : "outline"}
                    onPress={handleToggleUnavailable}
                    disabled={deleting || returning || lending}
                  >
                    {isMarkedUnavailable ? (
                      <Check
                        size={16}
                        color={
                          isMarkedUnavailable ? "#fff" : theme.foreground
                        }
                      />
                    ) : (
                      <EyeOff size={16} color={theme.foreground} />
                    )}
                    <Text>
                      {isMarkedUnavailable
                        ? "Mark Available"
                        : "Mark Unavailable"}
                    </Text>
                  </Button>
                )}

                <Button
                  variant="outline"
                  onPress={handleEdit}
                  disabled={deleting || returning || lending}
                >
                  <Edit size={16} color={theme.foreground} />
                  <Text>Edit Item</Text>
                </Button>
                <Button
                  variant="destructive-outline"
                  onPress={handleDelete}
                  disabled={deleting || returning || lending}
                >
                  <Trash2 size={16} color={theme.destructive} />
                  <Text>{deleting ? "Deleting…" : "Delete Item"}</Text>
                </Button>
              </>
            ) : (
              /* Viewer is a friend — driven by the same getItemAction() the
                 card uses, so labels/visibility can't drift from it. */
              <>
                {/* Approved (or lent to directly) and awaiting this viewer's
                    pickup confirmation — takes priority over everything else. */}
                {action.kind === "confirmPickup" && (
                  <Button onPress={handleConfirmHandoff} disabled={confirming}>
                    <Check size={16} color="#fff" />
                    <Text>{confirming ? "Confirming…" : action.label}</Text>
                  </Button>
                )}
                {/* Borrow / Request Next — same call, label differs by status */}
                {(action.kind === "borrow" || action.kind === "requestNext") && (
                  <Button onPress={handleBorrow} disabled={requesting}>
                    <Send size={16} color="#fff" />
                    <Text>{requesting ? "Sending…" : action.label}</Text>
                  </Button>
                )}
                {/* Owner marked it unavailable — offer to notify when it's back */}
                {isMarkedUnavailable && (
                  <Button
                    variant={availabilitySub ? "outline" : "default"}
                    onPress={handleToggleNotify}
                    disabled={subscribing}
                  >
                    {availabilitySub ? (
                      <BellOff size={16} color={theme.foreground} />
                    ) : (
                      <Bell size={16} color="#fff" />
                    )}
                    <Text>
                      {subscribing
                        ? "Please wait…"
                        : availabilitySub
                          ? "Cancel Notification"
                          : "Notify When Available"}
                    </Text>
                  </Button>
                )}
                {/* Cancel pending request / leave queue — destructive red */}
                {(action.kind === "cancelRequest" || action.kind === "leaveQueue") && (
                  <Button
                    variant="destructive"
                    onPress={handleCancelRequest}
                    disabled={requesting}
                  >
                    <X size={16} color="#fff" />
                    <Text>{requesting ? "Cancelling…" : action.label}</Text>
                  </Button>
                )}
              </>
            )}
          </View>
          {!isOwner && isAvailable && (
            <Caption
              className="text-center"
              style={{ marginTop: 16, marginBottom: 8 }}
            >
              Typically returned in 7–10 days
            </Caption>
          )}
        </View>
      </ScrollView>

      {/* ── Lend-to modal ── */}
      <Modal
        visible={lendPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLendPickerOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          onPress={() => setLendPickerOpen(false)}
        />
        <View
          style={{
            position: "absolute",
            bottom: lendPickerKeyboardHeight,
            left: 0,
            right: 0,
          }}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 12,
              paddingHorizontal: 20,
              paddingBottom: insets.bottom + 24,
              maxHeight: "80%",
              gap: 16,
            }}
          >
            {/* Handle bar */}
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.border,
                alignSelf: "center",
              }}
            />

            <BodyStrong style={{ fontSize: 17, textAlign: "center" }}>
              Lend to a Friend
            </BodyStrong>

            {/* Search */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isDark ? theme.muted : "#F3F4F6",
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 11,
                gap: 10,
              }}
            >
              <UserCircle size={18} color={theme.mutedForeground} />
              <TextInput
                value={lendSearch}
                onChangeText={setLendSearch}
                placeholder="Search friends…"
                placeholderTextColor={theme.mutedForeground}
                autoFocus
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: theme.foreground,
                  fontFamily: "Inter-Medium",
                }}
              />
            </View>

            {/* Friend list */}
            <FlatList
              data={friends.filter((f) =>
                f.name.toLowerCase().includes(lendSearch.toLowerCase()),
              )}
              keyExtractor={(f) => f.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: theme.border }} />
              )}
              renderItem={({ item: f }) => (
                <Pressable
                  onPress={() => handleLendTo(f.id)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                    gap: 12,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      overflow: "hidden",
                      backgroundColor: theme.primary + "22",
                    }}
                  >
                    {resolveAvatarSource(f.avatarUrl) ? (
                      <Image
                        source={resolveAvatarSource(f.avatarUrl)!}
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
                        <Caption style={{ color: theme.primary }}>
                          {getInitials(f.name)}
                        </Caption>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <BodyStrong style={{ fontSize: 15 }}>{f.name}</BodyStrong>
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={
                <Caption
                  style={{
                    textAlign: "center",
                    color: theme.mutedForeground,
                    paddingVertical: 24,
                  }}
                >
                  No friends match "{lendSearch}"
                </Caption>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
