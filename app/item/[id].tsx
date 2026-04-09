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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  Edit,
  Package,
  RotateCcw,
  Send,
  Tag,
  Trash2,
  User,
  BookOpen,
  X,
} from "lucide-react-native";
import {
  useItem,
  useDeleteItem,
  useMarkItemReturned,
  useItems,
} from "hooks/useItems";
import { useFriend, useFriends } from "hooks/useFriends";
import { CATEGORY_CONFIG } from "@/lib/category-config";
import {
  formatDate,
  formatRelativeTime,
  daysUntilDue,
  daysBorrowed,
  getInitials,
  calculateItemStatus,
  toProperCase,
} from "lib/utils";
import {
  createBorrowRequest,
  getMyBorrowRequestForItem,
  cancelBorrowRequest,
} from "@/lib/borrow-requests-service";
import type { BorrowRequest } from "lib/types";
import * as toast from "@/lib/toast";
import { resolveAvatarSource } from "@/lib/avatar-service";
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
  const { item, loading, refresh } = useItem(id!);

  const isBorrower =
    item && user && item.borrowedBy === user.id && !item.returnedDate;
  const isOwner = item && user && item.userId === user.id;
  // Load the borrower's friend profile only when the viewer is not the borrower
  // (querying the friendship table with your own ID causes an error)
  const borrowerFriendId =
    item?.borrowedBy && !item.returnedDate && !isBorrower
      ? item.borrowedBy
      : null;
  const { friend } = useFriend(borrowerFriendId);

  const { deleteItem, loading: deleting } = useDeleteItem();
  const { markReturned, loading: returning } = useMarkItemReturned();
  const { items: allItems } = useItems();
  const { friends } = useFriends();

  // Owner name: "Me" if current user owns it, otherwise look up in friends list
  const ownerFriend = friends.find((f) => f.id === item?.userId);
  const ownerName = isOwner ? "Me" : (ownerFriend?.name ?? "Unknown");

  // Borrow request state (for friend-viewer actions)
  const [borrowRequest, setBorrowRequest] = useState<BorrowRequest | null>(
    null,
  );
  const [requesting, setRequesting] = useState(false);

  const loadBorrowRequest = useCallback(async () => {
    if (!item || isOwner || isBorrower) return;
    try {
      const req = await getMyBorrowRequestForItem(item.id);
      setBorrowRequest(req);
    } catch {}
  }, [item?.id, isOwner, isBorrower]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      loadBorrowRequest();
    }, [refresh, loadBorrowRequest]),
  );

  const communityOwners = useMemo(() => {
    if (!item || item.category !== "book" || !item.metadata) return [];
    const bookMetadata = item.metadata as BookMetadata;
    if (!bookMetadata.author) return [];
    return allItems
      .filter((otherItem) => {
        if (otherItem.id === item.id) return false;
        if (otherItem.category !== "book") return false;
        if (!otherItem.metadata) return false;
        const otherMeta = otherItem.metadata as BookMetadata;
        return (
          otherItem.name.toLowerCase() === item.name.toLowerCase() &&
          otherMeta.author?.toLowerCase() === bookMetadata.author?.toLowerCase()
        );
      })
      .map((otherItem) => {
        const owner = friends.find((f) => otherItem.userId === "demo-user");
        return { item: otherItem, owner: owner || null };
      })
      .filter((o) => o.owner !== null);
  }, [item, allItems, friends]);

  useEffect(() => {
    if (!loading && !item) {
      router.back();
    }
  }, [loading, item, router]);

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

  if (loading || !item) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView
          edges={["top"]}
          style={{ backgroundColor: "transparent" }}
        >
          <Pressable
            onPress={goBack}
            style={({ pressed }) => ({
              margin: 16,
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: isDark ? theme.muted : "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <ArrowLeft size={22} color={theme.mutedForeground} />
          </Pressable>
        </SafeAreaView>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Caption>Loading…</Caption>
        </View>
      </View>
    );
  }

  const status: ItemStatus = calculateItemStatus(item);
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

  const statusLabel = isAvailable
    ? "Available"
    : isOverdue
      ? "Overdue"
      : "Lent Out";
  const statusColor = isAvailable
    ? theme.primary
    : isOverdue
      ? theme.destructive
      : theme.secondary;

  const handleMarkReturned = async () => {
    const actionText = isBorrower ? "returned to owner" : "marked as returned";
    try {
      await markReturned(item.id);
      toast.success(`"${item.name}" has been ${actionText}`);
      router.back();
    } catch {
      toast.error(`Failed to ${actionText.replace("has been ", "")}`);
    }
  };

  const handleEdit = () => {
    router.push(`/edit-item/${item.id}` as any);
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
      {/* Back button — SafeAreaView overlay, always on top of hero */}
      <SafeAreaView
        edges={["top"]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          backgroundColor: "transparent",
        }}
      >
        <Pressable
          onPress={goBack}
          style={{
            margin: 16,
            width: 44,
            height: 44,
            borderRadius: 50,
            backgroundColor: "rgba(0, 0, 0, 0.34)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={32} color="rgba(255, 255, 255, 0.91)" />
        </Pressable>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {/* ── Hero Image ── */}
        <View style={{ height: 400, width: "100%" }}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
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
                  <Avatar
                    style={{ width: 28, height: 28, borderRadius: 8 }}
                    alt={ownerName}
                  >
                    {ownerFriend?.avatarUrl ? (
                      <AvatarImage
                        source={
                          resolveAvatarSource(ownerFriend.avatarUrl) ?? {
                            uri: "",
                          }
                        }
                      />
                    ) : (
                      <AvatarFallback>
                        <Caption>{getInitials(ownerName)}</Caption>
                      </AvatarFallback>
                    )}
                  </Avatar>
                )}
                <View style={{ alignItems: "center" }}>
                  <TinyLabel style={{ marginBottom: 4 }}>Owner</TinyLabel>
                  <LabelStrong numberOfLines={1}>{ownerName}</LabelStrong>
                </View>
              </View>
            </View>

            <View style={{ width: 1, backgroundColor: theme.border }} />

            {/* Book rating / days borrowed */}
            <View style={{ alignItems: "center", flex: 1 }}>
              <TinyLabel style={{ marginBottom: 4 }}>
                {bookMeta?.averageRating ? "Rating" : "Duration"}
              </TinyLabel>
              <LabelStrong>
                {bookMeta?.averageRating
                  ? `${bookMeta.averageRating.toFixed(1)}/5`
                  : daysSinceBorrowed > 0
                    ? `${daysSinceBorrowed}d`
                    : "—"}
              </LabelStrong>
            </View>

            <View style={{ width: 1, backgroundColor: theme.border }} />

            {/* Due date or condition */}
            <View style={{ alignItems: "center", flex: 1 }}>
              <TinyLabel style={{ marginBottom: 4 }}>
                {item.dueDate ? "Due" : "Added"}
              </TinyLabel>
              <LabelStrong
                style={{
                  color: isOverdue ? theme.destructive : theme.foreground,
                }}
                numberOfLines={1}
              >
                {item.dueDate
                  ? formatDate(item.dueDate)
                  : formatDate(item.createdAt)}
              </LabelStrong>
            </View>
          </View>

          {/* ── Book metadata ── */}
          {bookMeta && (
            <View style={{ gap: 20, marginBottom: 24 }}>
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

          {/* ── Lent-out info panel ── always shown when item is lent out ── */}
          {!isAvailable && item.borrowedBy && (
            <>
              <Separator style={{ marginBottom: 20 }} />
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
                  <Avatar className="w-12 h-12" alt="You">
                    {appUser?.avatarUrl ? (
                      <AvatarImage
                        source={
                          resolveAvatarSource(appUser.avatarUrl) ?? { uri: "" }
                        }
                      />
                    ) : (
                      <AvatarFallback>
                        <BodyStrong style={{ color: theme.secondary }}>
                          {getInitials(appUser?.name)}
                        </BodyStrong>
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <View style={{ flex: 1 }}>
                    <TinyLabel style={{ marginBottom: 2 }}>
                      Currently Lent To
                    </TinyLabel>
                    <BodyStrong>You</BodyStrong>
                  </View>
                </View>
              ) : friend ? (
                // Viewer is the owner — show borrower with link to friend profile
                <TouchableOpacity
                  onPress={() => router.push(`/friends/${friend.id}` as any)}
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
                  activeOpacity={0.75}
                >
                  <Avatar className="w-12 h-12" alt={friend.name}>
                    {friend.avatarUrl ? (
                      <AvatarImage
                        source={
                          resolveAvatarSource(friend.avatarUrl) ?? { uri: "" }
                        }
                      />
                    ) : (
                      <AvatarFallback>
                        <BodyStrong style={{ color: theme.secondary }}>
                          {getInitials(friend.name)}
                        </BodyStrong>
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <View style={{ flex: 1 }}>
                    <TinyLabel style={{ marginBottom: 2 }}>
                      Currently Lent To
                    </TinyLabel>
                    <BodyStrong>{friend.name}</BodyStrong>
                    {friend.email && <Caption>{friend.email}</Caption>}
                  </View>
                  <ChevronRight size={18} color={theme.mutedForeground} />
                </TouchableOpacity>
              ) : null}
            </>
          )}

          {/* ── Timeline ── */}
          {(item.borrowedDate || item.returnedDate) && (
            <>
              <Separator style={{ marginBottom: 20 }} />
              <SectionHeading style={{ marginBottom: 16 }}>
                Timeline
              </SectionHeading>
              <View style={{ gap: 14, marginBottom: 24 }}>
                {item.borrowedDate && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Caption>Borrowed</Caption>
                    <View style={{ alignItems: "flex-end" }}>
                      <BodyStrong style={{ fontSize: 13 }}>
                        {formatDate(item.borrowedDate)}
                      </BodyStrong>
                      <Caption>{formatRelativeTime(item.borrowedDate)}</Caption>
                    </View>
                  </View>
                )}
                {item.dueDate && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Caption>Due Date</Caption>
                    <View style={{ alignItems: "flex-end" }}>
                      <BodyStrong
                        style={{
                          fontSize: 13,
                          color: isOverdue
                            ? theme.destructive
                            : theme.foreground,
                        }}
                      >
                        {formatDate(item.dueDate)}
                      </BodyStrong>
                      {!isAvailable && daysUntil !== undefined && (
                        <Caption
                          style={{
                            color: isOverdue
                              ? theme.destructive
                              : theme.mutedForeground,
                          }}
                        >
                          {isOverdue
                            ? `Overdue by ${Math.abs(daysUntil)}d`
                            : `Due in ${daysUntil}d`}
                        </Caption>
                      )}
                    </View>
                  </View>
                )}
                {item.returnedDate && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Caption>Returned</Caption>
                    <View style={{ alignItems: "flex-end" }}>
                      <BodyStrong
                        style={{ fontSize: 13, color: theme.primary }}
                      >
                        {formatDate(item.returnedDate)}
                      </BodyStrong>
                      <Caption>{formatRelativeTime(item.returnedDate)}</Caption>
                    </View>
                  </View>
                )}
                {daysSinceBorrowed > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Caption>Duration</Caption>
                    <BodyStrong style={{ fontSize: 13 }}>
                      {daysSinceBorrowed} day
                      {daysSinceBorrowed !== 1 ? "s" : ""}
                    </BodyStrong>
                  </View>
                )}
              </View>
            </>
          )}

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

          {/* ── Community Ownership ── */}
          {!isBorrower && communityOwners.length > 0 && (
            <>
              <Separator style={{ marginBottom: 20 }} />
              <SectionHeading style={{ marginBottom: 4 }}>
                Also in the Community
              </SectionHeading>
              <Caption style={{ marginBottom: 16 }}>
                {communityOwners.length}{" "}
                {communityOwners.length === 1 ? "person" : "people"} in your
                network {communityOwners.length === 1 ? "owns" : "own"} this
                book
              </Caption>
              <View style={{ gap: 10, marginBottom: 24 }}>
                {communityOwners.map(({ item: otherItem, owner }) => (
                  <View
                    key={otherItem.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      padding: 14,
                      backgroundColor: theme.muted,
                      borderRadius: 16,
                    }}
                  >
                    <Avatar className="w-10 h-10" alt={owner?.name ?? "?"}>
                      {owner?.avatarUrl ? (
                        <AvatarImage
                          source={
                            resolveAvatarSource(owner.avatarUrl) ?? { uri: "" }
                          }
                        />
                      ) : (
                        <AvatarFallback>
                          <Caption>
                            {owner ? getInitials(owner.name) : "?"}
                          </Caption>
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <View style={{ flex: 1 }}>
                      <BodyStrong style={{ fontSize: 13 }}>
                        {owner?.name ?? "Unknown"}
                      </BodyStrong>
                      {!otherItem.borrowedBy && !otherItem.returnedDate ? (
                        <Caption style={{ color: theme.primary }}>
                          Available
                        </Caption>
                      ) : otherItem.borrowedBy && !otherItem.returnedDate ? (
                        <Caption style={{ color: theme.secondary }}>
                          Currently lent out
                        </Caption>
                      ) : null}
                    </View>
                  </View>
                ))}
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
              /* Viewer is the borrower — return the item */
              <Button onPress={handleMarkReturned} disabled={returning}>
                <RotateCcw size={18} color="#fff" />
                <Text className="text-white font-bold">
                  {returning ? "Returning…" : "Return to Owner"}
                </Text>
              </Button>
            ) : isOwner ? (
              /* Viewer is the owner — owner management actions */
              <>
                {!isAvailable && item.borrowedBy && (
                  <Button
                    onPress={handleMarkReturned}
                    disabled={returning || deleting}
                  >
                    <Check size={18} color="#fff" />
                    <Text className="text-white font-bold">
                      {returning ? "Marking…" : "Mark as Returned"}
                    </Text>
                  </Button>
                )}
                <Button
                  variant="outline"
                  onPress={handleEdit}
                  disabled={deleting || returning}
                  style={{ borderColor: theme.border } as any}
                >
                  <Edit size={16} color={theme.foreground} />
                  <Text>Edit Item</Text>
                </Button>
                <Button
                  variant="outline"
                  onPress={handleDelete}
                  disabled={deleting || returning}
                  style={{ borderColor: theme.destructive + "44" } as any}
                >
                  <Trash2 size={16} color={theme.destructive} />
                  <Text style={{ color: theme.destructive }}>
                    {deleting ? "Deleting…" : "Delete Item"}
                  </Text>
                </Button>
              </>
            ) : (
              /* Viewer is a friend — borrow/request actions */
              <>
                {isAvailable && !borrowRequest && (
                  <Button onPress={handleBorrow} disabled={requesting}>
                    <Send size={16} color="#fff" />
                    <Text className="text-white font-bold">
                      {requesting ? "Sending…" : "Borrow"}
                    </Text>
                  </Button>
                )}
                {borrowRequest?.status === "pending" && (
                  <Button
                    variant="outline"
                    onPress={handleCancelRequest}
                    disabled={requesting}
                    style={{ borderColor: theme.border } as any}
                  >
                    <X size={16} color={theme.mutedForeground} />
                    <Text style={{ color: theme.mutedForeground }}>
                      {requesting ? "Cancelling…" : "Cancel Request"}
                    </Text>
                  </Button>
                )}
                {!isAvailable && !borrowRequest && (
                  <Button
                    disabled
                    style={{ backgroundColor: theme.destructive } as any}
                  >
                    <Text className="text-white font-bold">Request Next</Text>
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
    </View>
  );
}
