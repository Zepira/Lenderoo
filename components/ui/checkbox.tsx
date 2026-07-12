import { Pressable } from "react-native";
import { Check } from "lucide-react-native";
import { cn } from "@/lib/utils";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";

type CheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

function Checkbox({ checked, onCheckedChange, disabled, className }: CheckboxProps) {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
      className={cn("h-6 w-6 items-center justify-center rounded-md border-2", className)}
      style={{
        borderColor: checked ? theme.primary : theme.border,
        backgroundColor: checked ? theme.primary : "transparent",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {checked && <Check size={16} color={theme.primaryForeground} strokeWidth={3} />}
    </Pressable>
  );
}

export { Checkbox };
export type { CheckboxProps };
