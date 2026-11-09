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
import { THEME } from "@/lib/theme";
import type { ItemCategory } from "lib/types";

// color: the category colour for icons on tints, borders and dark
// backgrounds. ink: the colour for category text (and icons beside it); use
// categoryInk() to pick one. Ink is the same as color for now: the darker
// AA ink values were rolled back because they changed the look.
type CategoryStyle = {
  color: string;
  ink: { light: string; dark: string };
  Icon: React.ComponentType<{ size?: number; color?: string }>;
};

const same = (color: string) => ({ light: color, dark: color });

export const CATEGORY_CONFIG: Record<ItemCategory, CategoryStyle> = {
  book: { color: THEME.light.primary, ink: same(THEME.light.primary), Icon: BookOpen },
  tool: { color: "#F59E0B", ink: same("#F59E0B"), Icon: Wrench },
  clothing: { color: THEME.light.secondary, ink: same(THEME.light.secondary), Icon: Shirt },
  electronics: { color: "#8B5CF6", ink: same("#8B5CF6"), Icon: Smartphone },
  game: { color: THEME.light.destructive, ink: same(THEME.light.destructive), Icon: Gamepad2 },
  sports: { color: "#10B981", ink: same("#10B981"), Icon: Trophy },
  kitchen: { color: "#F97316", ink: same("#F97316"), Icon: UtensilsCrossed },
  other: { color: "#6B7280", ink: same("#6B7280"), Icon: Package },
};

export function categoryInk(category: ItemCategory, isDark: boolean): string {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other;
  return isDark ? cfg.ink.dark : cfg.ink.light;
}
