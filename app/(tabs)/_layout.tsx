import * as React from "react";
import { View, Platform, Pressable } from "react-native";
import { router, Tabs } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  Search,
  Home,
  UserCog,
  Plus,
  BookText,
  MessageSquare,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeSwitcher } from "../../components/ThemeSwitcher";
import { useThemeContext } from "../../contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { BorrowRequestBanner } from "@/components/BorrowRequestBannerNative";
import { FeedbackModal } from "@/components/FeedbackModal";
import { useRealtimeSync, useIncomingRequestCount } from "@/hooks";

const BTN_SIZE = 60;
const NAV_HEIGHT = 74;
// Container is taller than the pill so the overlapping button stays within
// the touchable area while visually sitting above the navbar.
const CONTAINER_HEIGHT = 120;

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // Only render routes that have a tabBarIcon — hides any auto-registered
  // routes (e.g. friends/) that shouldn't appear in the floating nav.
  const routes = state.routes.filter(
    (r) => descriptors[r.key]?.options?.tabBarIcon !== undefined,
  );
  const half = Math.floor(routes.length / 2);
  const leftRoutes = routes.slice(0, half);
  const rightRoutes = routes.slice(half);

  const renderTab = (route: (typeof routes)[0], index: number) => {
    const { options } = descriptors[route.key];
    const isFocused = state.index === index;
    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented)
        navigation.navigate(route.name);
    };
    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        hitSlop={{ top: 20, bottom: 20, left: 8, right: 8 }}
        style={{
          flex: 1,
          height: NAV_HEIGHT,
          alignItems: "center",
          justifyContent: "center",
          ...Platform.select({ web: { cursor: "pointer" } as object }),
        }}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
      >
        {options.tabBarIcon?.({
          focused: isFocused,
          color: isFocused ? "#00BFA6" : "#6B7280",
          size: 24,
        })}
      </Pressable>
    );
  };

  return (
    // Outer wrapper — only exists to let the center button overflow above the pill.
    // box-none: the wrapper itself won't intercept events; only its children will.
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: insets.bottom + 8,
        left: 12,
        right: 12,
        height: CONTAINER_HEIGHT,
        zIndex: 999,
      }}
    >
      {/* Pill + tab buttons in one element — visual and hit targets are identical */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: NAV_HEIGHT,
          borderRadius: 37,
          backgroundColor: "#101828",
          flexDirection: "row",
          alignItems: "stretch",
          elevation: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
        }}
      >
        {leftRoutes.map((route, i) => renderTab(route, i))}
        {/* Gap for the floating center button */}
        <View style={{ width: BTN_SIZE + 16 }} />
        {rightRoutes.map((route, i) => renderTab(route, i + half))}
      </View>

      {/* Center add button — floats above the pill */}
      <View
        style={{
          position: "absolute",
          bottom: 30,
          left: 0,
          right: 0,
          alignItems: "center",
        }}
      >
        <Pressable
          onPress={() => router.push("/add-item")}
          style={{
            width: BTN_SIZE,
            height: BTN_SIZE,
            borderRadius: BTN_SIZE / 2,
            backgroundColor: "#00BFA6",
            borderWidth: 4,
            borderColor: "white",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#00BFA6",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: Platform.OS === "android" ? 0 : 14,
            ...Platform.select({ web: { cursor: "pointer" } as object }),
          }}
          accessibilityRole="button"
          accessibilityLabel="Add item"
        >
          <Plus size={26} color="white" strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const insets = useSafeAreaInsets();
  const [bannerDismissed, setBannerDismissed] = React.useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = React.useState(false);

  // Single source of truth for all realtime DB updates
  useRealtimeSync();

  // Request count from cache — updates automatically via useRealtimeSync
  const requestCount = useIncomingRequestCount();

  // Re-show banner when new requests arrive
  React.useEffect(() => {
    if (requestCount > 0) setBannerDismissed(false);
  }, [requestCount]);

  // Memoize the header right component to prevent recreation
  const HeaderRight = React.useCallback(() => <ThemeSwitcher />, []);

  const handleBannerPress = () => {
    router.push("/(tabs)/library");
  };

  const handleBannerDismiss = () => {
    setBannerDismissed(true);
  };

  const screenOptions = React.useMemo(() => ({ headerShown: false }), []);

  const handleFeedbackPress = () => {
    setFeedbackModalVisible(true);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Borrow Request Banner */}
      {!bannerDismissed && (
        <BorrowRequestBanner
          count={requestCount}
          onPress={handleBannerPress}
          onDismiss={handleBannerDismiss}
        />
      )}

      <Tabs
        screenOptions={screenOptions}
        tabBar={(props) => <FloatingTabBar {...props} />}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
            headerTitle: "Home",
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "My Library",
            tabBarIcon: ({ color, size }) => (
              <BookText color={color} size={size} />
            ),
            headerTitle: "My Library",
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            tabBarIcon: ({ color, size }) => (
              <Search color={color} size={size} />
            ),
            headerTitle: "Explore",
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <UserCog color={color} size={size} />
            ),
            headerTitle: "Profile",
          }}
        />
        {/* Friends screens — registered without tabBarIcon so they are
            filtered out of the FloatingTabBar but remain navigable. */}
        <Tabs.Screen name="friends" options={{ headerShown: false }} />
      </Tabs>

      {/* Feedback Button */}
      <Button
        size="icon"
        variant="secondary"
        className="absolute right-4 w-14 h-14 rounded-full shadow-lg items-center justify-center"
        style={{
          elevation: 6,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
          bottom: insets.bottom + CONTAINER_HEIGHT,
        }}
        onPress={handleFeedbackPress}
      >
        <MessageSquare size={22} color="white" />
      </Button>

      {/* Feedback Modal */}
      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
      />
    </View>
  );
}
