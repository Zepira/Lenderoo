import { useRouter, useRootNavigation } from "expo-router";
import { View, Pressable, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, X } from "lucide-react-native";
import { CATEGORY_CONFIG } from "@/lib/category-config";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { PageTitle, TinyLabel, Caption } from "@/components/ui/typography";
import type { ItemCategory } from "lib/types";

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as ItemCategory[];

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  book: "Book",
  tool: "Tool",
  clothing: "Clothing",
  electronics: "Electronics",
  game: "Game",
  sports: "Sports",
  kitchen: "Kitchen",
  other: "Other",
};

export default function SelectCategoryScreen() {
  const router = useRouter();
  const rootNavigation = useRootNavigation();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;
  const { width } = useWindowDimensions();

  const outerPadding = 24;
  const gap = 12;
  const availableWidth = width - outerPadding * 2;

  // ~100px min gives 3 cols on 390px phone, more on tablets
  const numColumns = Math.max(
    2,
    Math.floor((availableWidth + gap) / (100 + gap)),
  );
  const itemWidth = Math.floor(
    (availableWidth - gap * (numColumns - 1)) / numColumns,
  );
  const itemHeight = Math.round(itemWidth * 1.15);

  // Split into rows, padding the last row with nulls so widths stay consistent
  const rows: (ItemCategory | null)[][] = [];
  for (let i = 0; i < CATEGORIES.length; i += numColumns) {
    const row = CATEGORIES.slice(i, i + numColumns) as (ItemCategory | null)[];
    while (row.length < numColumns) row.push(null);
    rows.push(row);
  }

  const handleCategorySelect = (category: ItemCategory) => {
    if (category === "book") {
      router.push("/add-item/search" as any);
    } else {
      router.push(`/add-item/generic?category=${category}` as any);
    }
  };

  const renderButton = (category: ItemCategory) => {
    const cfg = CATEGORY_CONFIG[category];
    return (
      <Pressable
        key={category}
        onPress={() => handleCategorySelect(category)}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <View
          style={{
            width: itemWidth,
            height: itemHeight,
            borderRadius: 20,
            backgroundColor: theme.card,
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            borderWidth: 1.5,
            borderColor: cfg.color + "40",
          }}
        >
          <cfg.Icon size={40} color={cfg.color} />
          <TinyLabel
            style={{ color: cfg.color, fontSize: 13, fontWeight: "500" }}
            className="normal-case tracking-normal"
          >
            {CATEGORY_LABELS[category]}
          </TinyLabel>
        </View>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? theme.muted : "#F3F4F6",
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        overflow: "hidden",
      }}
    >
      {/* Header */}
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
        }}
      >
        <SafeAreaView
          edges={["top"]}
          style={{ backgroundColor: "transparent" }}
        >
          <View
            style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28 }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
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
              <PageTitle style={{ flex: 1 }}>Add New Item</PageTitle>
              <Pressable
                onPress={() => rootNavigation?.goBack()}
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
                <X size={20} color={theme.mutedForeground} />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Content */}
      <View
        style={{
          paddingHorizontal: outerPadding,
          paddingTop: 24,
          paddingBottom: 24,
          gap: 16,
        }}
      >
        {/* Grid */}
        <View style={{ gap }}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={{ flexDirection: "row", gap }}>
              {row.map((category, colIndex) =>
                category === null ? (
                  <View
                    key={`spacer-${colIndex}`}
                    style={{ width: itemWidth, height: itemHeight }}
                  />
                ) : (
                  renderButton(category)
                ),
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
