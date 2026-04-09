/**
 * ItemTile — unified item card used on the library, dashboard, and friend
 * detail screens. Width is set by the parent; the tile fills it.
 *
 * Shared CATEGORY_CONFIG is exported so other files can import it
 * instead of duplicating the mapping.
 */

import { View, Image, Pressable } from "react-native";
import {
  BookOpen,
  Wrench,
  Shirt,
  Smartphone,
  Gamepad2,
  Trophy,
  UtensilsCrossed,
  Package,
} from "lucide-react-native";
import type { StyleProp, ViewStyle } from "react-native";
import type { Item, ItemCategory } from "lib/types";
import { THEME } from "@/lib/theme";
import { useThemeContext } from "@/contexts/ThemeContext";
import { BodyStrong, Caption, TinyLabel } from "@/components/ui/typography";

// ── Category config (single source of truth) ─────────────────────────────────

export const CATEGORY_CONFIG: Record<
  ItemCategory,
  { color: string; Icon: React.ComponentType<{ size: number; color: string }> }
> = {
  book: { color: THEME.light.primary, Icon: BookOpen },
  tool: { color: "#F59E0B", Icon: Wrench },
  clothing: { color: THEME.light.secondary, Icon: Shirt },
  electronics: { color: "#8B5CF6", Icon: Smartphone },
  game: { color: THEME.light.destructive, Icon: Gamepad2 },
  sports: { color: "#10B981", Icon: Trophy },
  kitchen: { color: "#F97316", Icon: UtensilsCrossed },
  other: { color: "#6B7280", Icon: Package },
};

// ── Status helpers ────────────────────────────────────────────────────────────

function resolveStatus(item: Item): { label: string; color: string } {
  if (item.returnedDate) return { label: "Returned", color: "#6B7280" };
  if (item.borrowedBy && !item.returnedDate)
    return { label: "Lent Out", color: THEME.light.secondary };
  return { label: "Available", color: THEME.light.primary };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ItemTileProps {
  item: Item;
  /** Secondary line shown below the item name, e.g. "To: John" or "From: Sarah". */
  sublabel?: string;
  /** Override the auto-computed status badge. */
  badgeLabel?: string;
  badgeColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ItemTile({
  item,
  sublabel,
  badgeLabel,
  badgeColor,
  onPress,
  style,
}: ItemTileProps) {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  const cfg = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.other;
  const imageUrl = item.images?.[0] ?? (item as any).imageUrl;
  const status = resolveStatus(item);
  const badge = {
    label: badgeLabel ?? status.label,
    color: badgeColor ?? status.color,
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: theme.card,
          borderRadius: 24,
          padding: 12,
          borderWidth: 1,
          borderColor: theme.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
          opacity: pressed ? 0.75 : 1,
          width: 50,
        },
        style,
      ]}
    >
      {/* Image / placeholder */}
      <View
        style={{
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
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
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
            backgroundColor: badge.color + "EE",
            borderRadius: 8,
            paddingHorizontal: 7,
            paddingVertical: 3,
          }}
        >
          <TinyLabel
            style={{ color: "white", fontSize: 8 }}
            className="normal-case tracking-normal"
          >
            {badge.label}
          </TinyLabel>
        </View>
      </View>

      {/* Name */}
      <BodyStrong style={{ fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
        {item.name}
      </BodyStrong>

      {/* Sublabel */}
      {sublabel ? (
        <Caption style={{ marginTop: 2 }} numberOfLines={1}>
          {sublabel}
        </Caption>
      ) : null}
    </Pressable>
  );
}
