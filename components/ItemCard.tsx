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
const COL_GAP = 32;
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
import { Send, X } from "lucide-react-native";
import type { Item, BorrowRequest } from "lib/types";
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
  /** Called when the card itself is tapped (library screen navigation). */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ItemCard({
  item,
  request,
  isRequesting = false,
  onBorrow,
  onCancel,
  onPress,
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
  const isUnavailable =
    !!(item.borrowedBy && !item.returnedDate) || hasApproved;

  let statusLabel = "Available";
  let statusColor = THEME.light.primary;
  if (hasPending) {
    statusLabel = "Requested";
    statusColor = THEME.light.secondary;
  } else if (isUnavailable) {
    statusLabel = "Borrowed";
    statusColor = "#6B7280";
  }

  const width = calcCardLayout(screenWidth).cardWidth;

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

        {/* Borrow button */}
        {!isUnavailable && !hasPending && onBorrow && (
          <Button
            variant="default"
            onPress={onBorrow}
            disabled={isRequesting}
            className="h-9 rounded-xl"
          >
            {isRequesting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Send size={12} color="white" />
                <Text className="text-xs normal-case tracking-normal text-primary-foreground">
                  Borrow
                </Text>
              </>
            )}
          </Button>
        )}

        {/* Cancel request button */}
        {hasPending && onCancel && (
          <Pressable
            onPress={onCancel}
            disabled={isRequesting}
            style={({ pressed }) => ({
              backgroundColor: isDark ? theme.muted : "#F3F4F6",
              borderRadius: 12,
              paddingVertical: 8,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 4,
              opacity: pressed || isRequesting ? 0.6 : 1,
            })}
          >
            {isRequesting ? (
              <ActivityIndicator size="small" color={theme.mutedForeground} />
            ) : (
              <>
                <X size={12} color={theme.mutedForeground} />
                <TinyLabel
                  style={{ color: theme.mutedForeground }}
                  className="normal-case tracking-normal"
                >
                  Cancel Request
                </TinyLabel>
              </>
            )}
          </Pressable>
        )}

        {/* Request Next button */}
        {isUnavailable &&
          (onBorrow !== undefined || onCancel !== undefined) && (
            <View
              style={{
                backgroundColor: theme.destructive,
                borderRadius: 12,
                paddingVertical: 8,
                alignItems: "center",
              }}
            >
              <TinyLabel
                className="normal-case tracking-normal"
                style={{ color: theme.destructiveForeground }}
              >
                Request Next
              </TinyLabel>
            </View>
          )}
      </View>
    </Pressable>
  );
}
