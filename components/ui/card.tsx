import { Text, TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { View, type ViewProps } from "react-native";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";

// Cards use rounded-3xl (24px) and a soft colored shadow per design spec.
function Card({ className, style, ...props }: ViewProps & React.RefAttributes<View>) {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View
        className={cn(
          "border-border flex flex-col gap-6 rounded-3xl border py-6 shadow-sm shadow-primary/10",
          className
        )}
        style={[{ backgroundColor: theme.card }, style]}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function CardHeader({
  className,
  ...props
}: ViewProps & React.RefAttributes<View>) {
  return (
    <View className={cn("flex flex-col gap-1.5 px-6", className)} {...props} />
  );
}

function CardTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<Text>) {
  return (
    <Text
      role="heading"
      aria-level={3}
      variant="h3"
      className={cn(className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<Text>) {
  return (
    <Text
      variant="muted"
      className={cn(className)}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: ViewProps & React.RefAttributes<View>) {
  return <View className={cn("px-6", className)} {...props} />;
}

function CardFooter({
  className,
  ...props
}: ViewProps & React.RefAttributes<View>) {
  return (
    <View
      className={cn("flex flex-row items-center px-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
