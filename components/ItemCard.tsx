import { memo, useState } from "react";
import type { ReactNode } from "react";
import {
  View,
  Image,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

// ── Layout calculator (exported so FlatList screens can use matching numColumns) ─
const H_PADDING = 32; // 16px left + 16px right
const COL_GAP = 12; // matches columnWrapperStyle={{ gap: 12 }} on every grid FlatList
const MIN_CARD_WIDTH = 120;

export function calcCardLayout(screenWidth: number) {
  const numColumns = Math.max(
    2,
    Math.floor(
      (screenWidth - H_PADDING + COL_GAP) / (MIN_CARD_WIDTH + COL_GAP),
    ),
  );
  const cardWidth =
    (screenWidth - H_PADDING - COL_GAP * (numColumns - 1)) / numColumns;
  return { numColumns, cardWidth };
}
import { X, RotateCcw, Check, Send, Bell, BellOff, Heart } from "lucide-react-native";
import type { Item, BorrowRequest } from "lib/types";
import { calculateItemStatus, getItemStatusDisplay } from "lib/utils";
import { getItemAction, type ItemActionKind } from "lib/item-actions";
import { CATEGORY_CONFIG } from "@/lib/category-config";
import { THEME } from "@/lib/theme";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateBorrowRequest, useCancelBorrowRequest } from "hooks/useBorrowRequests";
import { useConfirmHandoff, useInitiateReturn } from "hooks/useItems";
import { BodyStrong, TinyLabel } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import * as toast from "@/lib/toast";

interface ItemCardProps {
  item: Item;
  /** The current user's active (pending/approved) borrow request for this
   *  item, if any — the only handoff state not derivable from `item` alone. */
  request?: BorrowRequest;
  /** Called when the card itself is tapped. Defaults to navigating to the
   *  item detail screen. */
  onPress?: () => void;
  /** Called after this card's own action mutates the item/request, for
   *  screens whose item list isn't react-query-backed and won't otherwise
   *  pick up the change. */
  onChanged?: () => void;
  /** True when the current user has an active "notify when available" subscription. */
  isSubscribed?: boolean;
  /** Called when the user taps Notify/Cancel Notification (owner marked item unavailable). */
  onNotify?: () => void;
  /** True while a notify subscribe/unsubscribe call is in flight. */
  notifyBusy?: boolean;
  /** Called when the user taps the heart icon to toggle favourite status. */
  onToggleFavourite?: () => void;
  style?: StyleProp<ViewStyle>;
}

const ACTION_ICONS: Partial<Record<ItemActionKind, typeof Send>> = {
  borrow: Send,
  requestNext: Send,
  cancelRequest: X,
  leaveQueue: X,
  confirmPickup: Check,
  confirmReturn: Check,
  markReturned: RotateCcw,
};

const ACTION_VARIANTS: Partial<Record<ItemActionKind, "default" | "destructive" | "secondary">> = {
  cancelRequest: "destructive",
  leaveQueue: "destructive",
  markReturned: "secondary",
};

export const ItemCard = memo(function ItemCard({
  item,
  request,
  onPress,
  onChanged,
  isSubscribed = false,
  onNotify,
  notifyBusy = false,
  onToggleFavourite,
  style,
}: ItemCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;
  const { user } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const { createRequest } = useCreateBorrowRequest();
  const { cancel } = useCancelBorrowRequest();
  const { confirmHandoff } = useConfirmHandoff();
  const { initiateReturn } = useInitiateReturn();

  const cfg = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.other;
  const imageUrl = item.images?.[0] ?? (item as any).imageUrl;

  const isBorrowedByMe = item.borrowedBy === user?.id;
  const itemStatus = calculateItemStatus(item);
  const isLentOut = itemStatus === "borrowed" || itemStatus === "overdue";
  const isMarkedUnavailable = itemStatus === "available" && !!item.isUnavailable;

  const action = getItemAction(item, user?.id, request);

  const { label: statusLabel, color: statusColor } = getItemStatusDisplay(
    itemStatus,
    isBorrowedByMe,
    request,
    isMarkedUnavailable,
    isLentOut && !!item.pendingRecipientId,
    action.kind === "confirmPickup",
  );

  const width = calcCardLayout(screenWidth).cardWidth;

  const runAction = async () => {
    setSubmitting(true);
    try {
      switch (action.kind) {
        case "borrow":
        case "requestNext":
          await createRequest({ itemId: item.id, ownerId: item.userId });
          toast.success("Request sent!");
          break;
        case "cancelRequest":
        case "leaveQueue":
          if (request) await cancel(request.id);
          toast.success("Request cancelled");
          break;
        case "confirmPickup":
          await confirmHandoff(item.id);
          toast.success("Pickup confirmed");
          break;
        case "confirmReturn":
          await confirmHandoff(item.id);
          toast.success("Return confirmed");
          break;
        case "markReturned":
          await initiateReturn(item.id);
          toast.success("Waiting for confirmation…");
          break;
      }
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  let actionButton: ReactNode = null;
  if (action.kind !== "none") {
    const Icon = ACTION_ICONS[action.kind];
    const variant = ACTION_VARIANTS[action.kind] ?? "default";
    const iconColor = variant === "secondary" ? theme.secondaryForeground : "#fff";
    actionButton = (
      <Button
        variant={variant}
        size="xs"
        onPress={runAction}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <>
            {Icon && <Icon size={12} color={iconColor} />}
            <Text>{action.label}</Text>
          </>
        )}
      </Button>
    );
  } else if (isMarkedUnavailable && !isBorrowedByMe && onNotify) {
    actionButton = (
      <Button
        variant={isSubscribed ? "outline" : "default"}
        size="xs"
        onPress={onNotify}
        disabled={notifyBusy}
      >
        {isSubscribed ? (
          <>
            <BellOff size={12} color={theme.foreground} />
            <Text>Cancel Notify</Text>
          </>
        ) : (
          <>
            <Bell size={12} color="#fff" />
            <Text>Notify Me</Text>
          </>
        )}
      </Button>
    );
  }

  const heartButton = onToggleFavourite && (
    <Button
      variant="outline"
      size="xs"
      className="w-9 px-0 border-0 shadow-sm shadow-black/15"
      onPress={onToggleFavourite}
    >
      <Heart
        size={15}
        color="#EF4444"
        fill={item.isFavourite ? "#EF4444" : "none"}
      />
    </Button>
  );

  const handlePress =
    onPress ?? (() => router.push(`/item/${item.id}` as any));

  return (
    <Animated.View entering={FadeInDown.duration(220).damping(18)} style={style}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      >
      <View
        style={{
          backgroundColor: theme.card,
          borderRadius: 24,
          padding: 12,
          borderWidth: 1,
          borderColor: theme.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 4,
          flex: 1,
          width: width,
          flexDirection: "column",
        }}
      >
        {/* Image / placeholder */}
        <View
          style={{
            width: "100%",
            aspectRatio: 3 / 4,
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: cfg.color + "18",
            marginBottom: 10,
          }}
        >
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
              }}
            >
              <cfg.Icon size={36} color={cfg.color} />
            </View>
          )}

          {/* Status badge */}
          <View
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              backgroundColor: statusColor + "EE",
              borderRadius: 8,
              paddingHorizontal: 7,
              paddingVertical: 3,
            }}
          >
            <TinyLabel
              style={{ color: "white", fontSize: 8 }}
              className="normal-case tracking-normal"
            >
              {statusLabel}
            </TinyLabel>
          </View>
        </View>

        {/* Name — grows to push button to bottom */}
        <View style={{ flex: 1 }}>
          <BodyStrong
            style={{ fontSize: 13, lineHeight: 18, marginBottom: 8 }}
            numberOfLines={2}
          >
            {item.name}
          </BodyStrong>
        </View>

        {/* Action button + favourite heart, inline */}
        {(actionButton || heartButton) && (
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            {actionButton && <View style={{ flex: 1 }}>{actionButton}</View>}
            {heartButton}
          </View>
        )}
      </View>
      </Pressable>
    </Animated.View>
  );
});
