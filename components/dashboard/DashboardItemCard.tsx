import { View, Image, Pressable, useWindowDimensions } from "react-native";
import { CATEGORY_CONFIG } from "@/components/ItemTile";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { BodyStrong, Caption } from "@/components/ui/typography";
import type { Item } from "lib/types";

// 3.5 cards visible; 24px padding each side, 12px gap between cards
const SCREEN_PADDING = 48;
const ITEM_GAP = 12;
const CARDS_VISIBLE = 3.5;

interface DashboardItemCardProps {
  item: Item;
  personName: string;
  type: "borrowed" | "lent";
  onPress?: () => void;
}

export function DashboardItemCard({
  item,
  personName,
  type,
  onPress,
}: DashboardItemCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  const cardWidth = 120;
  const imageSize = cardWidth - 16; // 8px padding each side

  const cfg = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.other;
  const imageUrl = item.images?.[0] ?? (item as any).imageUrl;
  const sublabel =
    type === "borrowed" ? `From: ${personName}` : `To: ${personName}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: cardWidth,
        backgroundColor: theme.card,
        borderRadius: 20,
        padding: 8,
        borderWidth: 1,
        borderColor: theme.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {/* 3:4 portrait image / icon placeholder */}
      <View
        style={{
          width: imageSize,
          aspectRatio: 3 / 4,
          borderRadius: 14,
          overflow: "hidden",
          backgroundColor: cfg.color + "18",
          marginBottom: 8,
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
            <cfg.Icon size={Math.round(imageSize * 0.38)} color={cfg.color} />
          </View>
        )}

        {/* Colour dot — lent=yellow, borrowed=teal */}
        <View
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor:
              type === "lent" ? THEME.light.secondary : THEME.light.primary,
            borderWidth: 1.5,
            borderColor: theme.card,
          }}
        />
      </View>

      <BodyStrong
        style={{ fontSize: 12, lineHeight: 17, width: imageSize }}
        numberOfLines={2}
      >
        {item.name}
      </BodyStrong>

      <Caption
        style={{ fontSize: 11, marginTop: 2, width: imageSize }}
        numberOfLines={1}
      >
        {sublabel}
      </Caption>
    </Pressable>
  );
}
