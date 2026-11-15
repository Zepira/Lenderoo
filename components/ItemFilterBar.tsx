import { useState } from "react";
import { View, Pressable } from "react-native";
import { ArrowUpDown, Check } from "lucide-react-native";
import { Caption } from "@/components/ui/typography";
import { HorizontalScroller } from "@/components/HorizontalScroller";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { CATEGORY_CONFIG, categoryInk } from "@/lib/category-config";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { ItemCategory } from "@/lib/types";
import {
  SORT_LABELS,
  SORT_SHORT,
  categoryCounts,
  sortOptions,
  type ItemSort,
} from "@/lib/item-filters";

interface ItemFilterBarProps {
  /** The items being filtered, before the category filter (for counts and options). */
  items: { category: ItemCategory; dueDate?: Date }[];
  category: ItemCategory | null;
  sort: ItemSort;
  onCategoryChange: (category: ItemCategory | null) => void;
  onSortChange: (sort: ItemSort) => void;
  /** Hide the category chips (Explore has its own category cards). */
  showCategories?: boolean;
  /** The parent's horizontal padding, so the chips scroll to the screen edge. */
  bleed?: number;
  /** What the default ("recent") order is called here, when it isn't newest first (Saved). */
  defaultSortLabel?: { short: string; long: string };
}

/**
 * Category chips (only the categories in the list, with counts) and a sort menu, for My Library,
 * Borrowed, a friend's library and Explore. Rules in lib/item-filters.ts.
 */
export function ItemFilterBar({
  items,
  category,
  sort,
  onCategoryChange,
  onSortChange,
  showCategories = true,
  bleed = 24,
  defaultSortLabel,
}: ItemFilterBarProps) {
  const shortLabel = (s: ItemSort) => (s === "recent" && defaultSortLabel ? defaultSortLabel.short : SORT_SHORT[s]);
  const longLabel = (s: ItemSort) => (s === "recent" && defaultSortLabel ? defaultSortLabel.long : SORT_LABELS[s]);
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;
  const pageBg = isDark ? theme.muted : "#F3F4F6";
  const [sortOpen, setSortOpen] = useState(false);

  const cats = categoryCounts(items);
  const sorts = sortOptions(items);
  const chipCats = showCategories && cats.length > 1;
  if (items.length < 2) return null;

  const chip = (selected: boolean, color = THEME.light.primary) => ({
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: selected ? color + "1F" : theme.card,
    borderWidth: 1.5,
    borderColor: selected ? color : theme.border,
  });

  const sortButton = (
    <Pressable
      onPress={() => setSortOpen((o) => !o)}
      accessibilityRole="button"
      accessibilityLabel={`Sort: ${longLabel(sort)}`}
      accessibilityState={{ expanded: sortOpen }}
      style={chip(sortOpen)}
    >
      <ArrowUpDown size={14} color={theme.mutedForeground} />
      <Caption style={{ color: theme.foreground }} numberOfLines={1}>
        {shortLabel(sort)}
      </Caption>
    </Pressable>
  );

  return (
    <View style={{ gap: 8 }}>
      {chipCats ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <HorizontalScroller bleed={0} fadeColor={pageBg} gap={6}>
              <Pressable
                onPress={() => onCategoryChange(null)}
                accessibilityRole="button"
                accessibilityState={{ selected: category === null }}
                accessibilityLabel={`All types, ${items.length}`}
                style={chip(category === null)}
              >
                <Caption style={{ color: category === null ? theme.primaryInk : theme.foreground, fontWeight: "600" }}>
                  All types
                </Caption>
              </Pressable>
              {cats.map(({ category: c, count }) => {
                const selected = category === c;
                const ink = categoryInk(c, isDark);
                const Icon = CATEGORY_CONFIG[c].Icon;
                return (
                  <Pressable
                    key={c}
                    onPress={() => onCategoryChange(selected ? null : c)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${CATEGORY_LABELS[c]}, ${count}`}
                    style={chip(selected, ink)}
                  >
                    <Icon size={14} color={ink} />
                    <Caption style={{ color: selected ? ink : theme.foreground, fontWeight: selected ? "600" : "400" }}>
                      {CATEGORY_LABELS[c]} · {count}
                    </Caption>
                  </Pressable>
                );
              })}
            </HorizontalScroller>
          </View>
          {sortButton}
        </View>
      ) : (
        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>{sortButton}</View>
      )}

      {sortOpen && (
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 6 }}
        >
          {sorts.map((s) => {
            const selected = s === sort;
            return (
              <Pressable
                key={s}
                onPress={() => {
                  onSortChange(s);
                  setSortOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={chip(selected)}
              >
                {selected && <Check size={14} color={theme.primaryInk} />}
                <Caption style={{ color: selected ? theme.primaryInk : theme.foreground, fontWeight: selected ? "600" : "400" }}>
                  {longLabel(s)}
                </Caption>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
