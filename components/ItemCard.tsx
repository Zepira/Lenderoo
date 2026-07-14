import { memo } from "react";
import type { ReactNode } from "react";
import {
  View,
  Image,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

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
import { X, RotateCcw, Bell, BellOff, Heart } from "lucide-react-native";
import type { Item, BorrowRequest } from "lib/types";
import { calculateItemStatus, getItemStatusDisplay } from "lib/utils";
import { CATEGORY_CONFIG } from "@/lib/category-config";
import { THEME } from "@/lib/theme";
import { useThemeContext } from "@/contexts/ThemeContext";
import { BodyStrong, TinyLabel } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

interface ItemCardProps {
  item: Item;
  /** The current user's active borrow request for this item, if any. */
  request?: BorrowRequest;
  /** True while a borrow/cancel network call is in flight for this item. */
  isRequesting?: boolean;
  /** Called when the user taps Borrow. */
  onBorrow?: () => void;
  /** Called when the user taps Cancel Request. */
  onCancel?: () => void;
  /** True when the current user is the one borrowing this item. */
  isBorrowedByMe?: boolean;
  /** Called when the user taps Return (only shown when isBorrowedByMe). */
  onReturn?: () => void;
  /** Called when the card itself is tapped (library screen navigation). */
  onPress?: () => void;
  /** True when the current user has an active "notify when available" subscription. */
  isSubscribed?: boolean;
  /** Called when the user taps Notify/Cancel Notification (owner marked item unavailable). */
  onNotify?: () => void;
  /** Called when the user taps the heart icon to toggle favourite status. */
  onToggleFavourite?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ItemCard = memo(function ItemCard({
  item,
  request,
  isRequesting = false,
  onBorrow,
  onCancel,
  isBorrowedByMe = false,
  onReturn,
  onPress,
  isSubscribed = false,
  onNotify,
  onToggleFavourite,
  style,
}: ItemCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  const cfg = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.other;
  const imageUrl = item.images?.[0] ?? (item as any).imageUrl;

  const hasPending = request?.status === "pending";
  const hasApproved = request?.status === "approved";
  const itemStatus = calculateItemStatus(item);
  const isLentOut = itemStatus === "borrowed" || itemStatus === "overdue";
  const isMarkedUnavailable = itemStatus === "available" && !!item.isUnavailable;
  const isUnavailable = isLentOut || isMarkedUnavailable;

  const { label: statusLabel, color: statusColor } = getItemStatusDisplay(
    itemStatus,
    isBorrowedByMe,
    request,
    isMarkedUnavailable,
  );

  const width = calcCardLayout(screenWidth).cardWidth;

  const canBeBorrowed =
    !isUnavailable && !hasPending && !hasApproved && onBorrow;

  // Mutually-exclusive per-status action button (Borrow / Cancel / Return /
  // Request Next / Notify) — computed once so it can share a row with the
  // favourite heart below instead of each being a separate full-width block.
  let actionButton: ReactNode = null;
  if (canBeBorrowed) {
    actionButton = (
      <Button size="xs" onPress={onBorrow} disabled={isRequesting}>
        {isRequesting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text>Borrow</Text>
        )}
      </Button>
    );
  } else if ((hasPending || hasApproved) && onCancel) {
    actionButton = (
      <Button
        variant="destructive"
        size="xs"
        onPress={onCancel}
        disabled={isRequesting}
      >
        {isRequesting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <X size={12} color="#fff" />
            <Text>{hasApproved ? "Leave Queue" : "Cancel Request"}</Text>
          </>
        )}
      </Button>
    );
  } else if (isUnavailable && isBorrowedByMe && onReturn) {
    actionButton = (
      <Button
        variant="secondary"
        size="xs"
        onPress={onReturn}
        disabled={isRequesting}
      >
        {isRequesting ? (
          <ActivityIndicator size="small" color={theme.secondaryForeground} />
        ) : (
          <>
            <RotateCcw size={12} color={theme.secondaryForeground} />
            <Text>Return</Text>
          </>
        )}
      </Button>
    );
  } else if (
    isLentOut &&
    !isBorrowedByMe &&
    !hasPending &&
    !hasApproved &&
    onBorrow !== undefined
  ) {
    actionButton = (
      <Button size="xs" onPress={onBorrow} disabled={isRequesting}>
        {isRequesting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text>Request Next</Text>
        )}
      </Button>
    );
  } else if (isMarkedUnavailable && !isBorrowedByMe && onNotify) {
    actionButton = (
      <Button
        variant={isSubscribed ? "outline" : "default"}
        size="xs"
        onPress={onNotify}
        disabled={isRequesting}
      >
        {isRequesting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : isSubscribed ? (
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

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { opacity: pressed && onPress ? 0.75 : 1 },
        style,
      ]}
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
  );
});
