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

// color: the bright category colour for icons on tints, borders and dark
// backgrounds. ink: the colour for category text (and icons beside it),
// light value >= 4.5:1 on the light card and as a fill behind white text,
// dark value >= 4.5:1 on the dark card. Use categoryInk() to pick one.
type CategoryStyle = {
  color: string;
  ink: { light: string; dark: string };
  Icon: React.ComponentType<{ size: number; color: string }>;
};

export const CATEGORY_CONFIG: Record<ItemCategory, CategoryStyle> = {
  book: { color: THEME.light.primary, ink: { light: THEME.light.primaryInk, dark: THEME.dark.primaryInk }, Icon: BookOpen },
  tool: { color: "#F59E0B", ink: { light: "#B45309", dark: "#F59E0B" }, Icon: Wrench },
  clothing: { color: THEME.light.secondary, ink: { light: "#A16207", dark: THEME.dark.secondary }, Icon: Shirt },
  electronics: { color: "#8B5CF6", ink: { light: "#7C3AED", dark: "#A78BFA" }, Icon: Smartphone },
  game: { color: THEME.light.destructive, ink: { light: "#DC2626", dark: THEME.dark.destructive }, Icon: Gamepad2 },
  sports: { color: "#10B981", ink: { light: "#047857", dark: "#10B981" }, Icon: Trophy },
  kitchen: { color: "#F97316", ink: { light: "#C2410C", dark: "#F97316" }, Icon: UtensilsCrossed },
  other: { color: "#6B7280", ink: { light: "#6B7280", dark: "#9CA3AF" }, Icon: Package },
};

export function categoryInk(category: ItemCategory, isDark: boolean): string {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other;
  return isDark ? cfg.ink.dark : cfg.ink.light;
}
