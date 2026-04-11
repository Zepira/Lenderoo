import { View } from "react-native";
import { AlertCircle } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { BodyStrong, Caption } from "@/components/ui/typography";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
}: ErrorStateProps) {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        gap: 16,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: theme.destructive + "18",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertCircle size={32} color={theme.destructive} />
      </View>
      <View style={{ alignItems: "center", gap: 6 }}>
        <BodyStrong style={{ textAlign: "center" }}>Oops!</BodyStrong>
        <Caption style={{ textAlign: "center", color: theme.mutedForeground }}>
          {message}
        </Caption>
      </View>
      {onRetry && (
        <Button variant="outline" onPress={onRetry}>
          <Text>Try Again</Text>
        </Button>
      )}
    </View>
  );
}
