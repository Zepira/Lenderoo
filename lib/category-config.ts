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
