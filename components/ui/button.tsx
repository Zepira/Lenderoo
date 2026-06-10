import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Platform, Pressable, TouchableOpacity } from "react-native";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";

// Buttons use rounded-lg (16px via --radius) per design spec.
// Shadows use the brand color at low opacity for a "lifted" feel.
const buttonVariants = cva(
  cn(
    "group shrink-0 flex-row items-center justify-center gap-2 rounded-lg shadow-none",
    Platform.select({
      web: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    }),
  ),
  {
    variants: {
      variant: {
        // Primary — green #00BFA6
        default: cn(
          "bg-primary active:opacity-90 shadow-sm shadow-primary/20",
          Platform.select({ web: "hover:opacity-90" }),
        ),
        // Destructive — red #FF6B6B
        destructive: cn(
          "bg-destructive active:opacity-90 shadow-sm shadow-destructive/20",
          Platform.select({ web: "hover:opacity-90" }),
        ),
        // Destructive outline — transparent bg, red border and text
        "destructive-outline": cn(
          "border-2 border-destructive bg-background active:bg-destructive/10 dark:bg-input/30 dark:border-destructive dark:active:bg-destructive/20",
          Platform.select({
            web: "hover:bg-destructive/10 dark:hover:bg-destructive/20",
          }),
        ),
        // Outline
        outline: cn(
          "border-border bg-background active:bg-muted dark:bg-input/30 dark:border-input dark:active:bg-input/50 border-2 shadow-sm shadow-black/5",
          Platform.select({ web: "hover:bg-muted dark:hover:bg-input/50" }),
        ),
        // Secondary — yellow #FFC857
        secondary: cn(
          "bg-secondary active:opacity-90 shadow-sm shadow-secondary/20",
          Platform.select({ web: "hover:opacity-90" }),
        ),
        // Ghost — no background
        ghost: cn(
          "active:bg-muted dark:active:bg-muted/50",
          Platform.select({ web: "hover:bg-muted dark:hover:bg-muted/50" }),
        ),
        // Outline White — transparent bg, white border, for use on coloured backgrounds
        "outline-white": cn(
          "border-2 border-white active:bg-white/10",
          Platform.select({ web: "hover:bg-white/10" }),
        ),
        // Link
        link: "",
      },
      size: {
        default: cn("h-14 px-6", Platform.select({ web: "has-[>svg]:px-4" })),
        sm: cn(
          "h-14 gap-1.5 rounded-md px-4",
          Platform.select({ web: "has-[>svg]:px-3" }),
        ),
        lg: cn(
          "h-14 rounded-lg px-8",
          Platform.select({ web: "has-[>svg]:px-5" }),
        ),
        // Compact card-sized button (e.g. ItemCard actions)
        xs: cn(
          "h-9 px-3 rounded-xl gap-1",
          Platform.select({ web: "has-[>svg]:px-2.5" }),
        ),
        icon: "h-14 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// Button text — Inter Bold 16px per design spec
const buttonTextVariants = cva(
  cn(
    "font-sans-bold text-base",
    Platform.select({ web: "pointer-events-none transition-colors" }),
  ),
  {
    variants: {
      variant: {
        default: "text-primary-foreground",
        destructive: "text-destructive-foreground",
        "destructive-outline": cn(
          "text-destructive group-active:text-destructive",
          Platform.select({ web: "group-hover:text-destructive" }),
        ),
        outline: cn(
          "text-foreground group-active:text-foreground",
          Platform.select({ web: "group-hover:text-foreground" }),
        ),
        secondary: "text-secondary-foreground",
        ghost: "text-foreground group-active:text-foreground",
        "outline-white": "text-white",
        link: cn(
          "text-primary group-active:underline",
          Platform.select({
            web: "underline-offset-4 hover:underline group-hover:underline",
          }),
        ),
      },
      size: {
        default: "",
        sm: "text-base",
        lg: "",
        xs: "text-xs normal-case tracking-normal",
        icon: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    isSelected?: boolean;
  };

function Button({
  className,
  variant,
  size,
  style,
  isSelected,
  ...props
}: ButtonProps) {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  const getBackgroundColor = () => {
    if (variant === "default" || variant == null) return theme.primary;
    if (variant === "secondary") return theme.secondary;
    if (variant === "destructive") return theme.destructive;
    if (variant === "outline")
      return Platform.OS === "web" ? undefined : "transparent";
    if (variant === "destructive-outline")
      return Platform.OS === "web" ? undefined : "transparent";
    if (variant === "outline-white")
      return Platform.OS === "web" ? undefined : "transparent";
    return undefined;
  };

  const getShadowStyle = () => {
    // Shadow color matches the button background so it reads as a "lift" of the same hue
    const shadowColor =
      variant === "default" || variant == null
        ? theme.primary
        : variant === "secondary"
          ? theme.secondary
          : variant === "destructive"
            ? theme.destructive
            : undefined;

    if (!shadowColor) return undefined;
    return {
      shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    };
  };

  const backgroundColor = getBackgroundColor();
  const shadowStyle = getShadowStyle();
  const combinedStyle = [
    backgroundColor ? { backgroundColor } : undefined,
    shadowStyle,
    style,
  ].filter(Boolean);

  return (
    <TextClassContext.Provider
      value={cn(
        buttonTextVariants({ variant, size }),
        isSelected && "text-primary-foreground",
      )}
    >
      <TouchableOpacity
        className={cn(
          props.disabled && "opacity-50",
          buttonVariants({ variant, size }),
          isSelected && "border-2 border-primary-foreground",
          className,
        )}
        style={combinedStyle}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
