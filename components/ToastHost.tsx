import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { dismiss, subscribeToToasts, type NativeToast } from "@/lib/toast";

// Native toasts (iOS + Android). Drawn in React Native because burnt's iOS
// toast (SPIndicator) renders blank on iOS 27 and never dismisses, leaving a
// white bar over the tab bar.

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  none: null,
} as const;

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const { activeTheme } = useThemeContext();
  const theme = activeTheme === "dark" ? THEME.dark : THEME.light;
  const [toast, setToast] = useState<NativeToast | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hide = () => {
      Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }).start(
        ({ finished }) => finished && setToast(null)
      );
    };
    const unsubscribe = subscribeToToasts((next) => {
      if (timer.current) clearTimeout(timer.current);
      if (!next) return hide();
      setToast(next);
      Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      timer.current = setTimeout(hide, next.duration);
    });
    return () => {
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [progress]);

  if (!toast) return null;

  const Icon = ICONS[toast.kind];
  const iconColor = {
    success: theme.primary,
    error: theme.destructive,
    warning: "#F59E0B",
    info: theme.mutedForeground,
    none: theme.mutedForeground,
  }[toast.kind];

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 8 }]}>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={{
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
        }}
      >
        <Pressable
          accessibilityRole="alert"
          onPress={dismiss}
          style={[styles.pill, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          {Icon && <Icon size={20} color={iconColor} />}
          <View style={styles.text}>
            <Text className="font-sans-medium" numberOfLines={2}>
              {toast.title}
            </Text>
            {toast.description ? (
              <Text variant="muted" numberOfLines={3}>
                {toast.description}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 16, right: 16, alignItems: "center", zIndex: 1000 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: 480,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  text: { flexShrink: 1, gap: 2 },
});
