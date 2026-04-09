import { useRouter } from "expo-router";
import { View, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { CATEGORY_CONFIG } from "@/components/ItemTile";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import {
  PageTitle,
  SectionHeading,
  TinyLabel,
  BodyText,
  Caption,
} from "@/components/ui/typography";
import type { ItemCategory } from "lib/types";

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as ItemCategory[];

// Split into two rows of 4
const ROW1 = CATEGORIES.slice(0, 4);
const ROW2 = CATEGORIES.slice(4);

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
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  const handleCategorySelect = (category: ItemCategory) => {
    if (category === "book") {
      router.push("/add-item/search" as any);
    } else {
      router.push(`/add-item/generic?category=${category}` as any);
    }
  };

  const renderCategoryButton = (category: ItemCategory) => {
    const cfg = CATEGORY_CONFIG[category];
    return (
      <Pressable
        key={category}
        onPress={() => handleCategorySelect(category)}
        style={({ pressed }) => ({
          flex: 1,
          alignItems: "center",
          gap: 8,
          paddingVertical: 14,
          paddingHorizontal: 8,
          borderRadius: 20,
          backgroundColor: pressed ? cfg.color + "22" : cfg.color + "14",
          borderWidth: 1.5,
          borderColor: cfg.color + "40",
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <cfg.Icon size={24} color={cfg.color} />
        <TinyLabel
          style={{ color: cfg.color, fontSize: 9 }}
          className="normal-case tracking-normal"
        >
          {CATEGORY_LABELS[category]}
        </TinyLabel>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}>
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
          marginBottom: 24,
        }}
      >
        <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
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
              <PageTitle>Add New Item</PageTitle>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48, gap: 16 }}
      >
        {/* Category picker */}
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 32,
            padding: 24,
            borderWidth: 1,
            borderColor: theme.border,
            gap: 16,
          }}
        >
          <View style={{ gap: 4 }}>
            <TinyLabel>Item Category</TinyLabel>
            <Caption>What kind of item are you adding?</Caption>
          </View>

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {ROW1.map(renderCategoryButton)}
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {ROW2.map(renderCategoryButton)}
            </View>
          </View>
        </View>

        {/* Book hint */}
        <View
          style={{
            backgroundColor: THEME.light.primary + "12",
            borderRadius: 20,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderWidth: 1,
            borderColor: THEME.light.primary + "30",
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: THEME.light.primary + "22",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CATEGORY_CONFIG.book.Icon size={18} color={THEME.light.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <BodyText style={{ fontSize: 13, color: THEME.light.primary }}>
              Books auto-fill from Hardcover
            </BodyText>
            <Caption style={{ fontSize: 11 }}>
              Search by title or author to pre-fill all details
            </Caption>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
