import * as React from "react";
import { Animated, View, Platform, Pressable, useWindowDimensions } from "react-native";
import { router, Tabs, useIsFocused } from "expo-router";
import type { BottomTabBarProps } from "expo-router/tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import {
  Search,
  Home,
  UserCog,
  Plus,
  BookText,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeSwitcher } from "../../components/ThemeSwitcher";
import { useThemeContext } from "../../contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";
import { AdBar, isAdScreen, useAdBarLift } from "@/components/QuietBanner";
import {
  TAB_BAR_BOTTOM_GAP,
  TAB_BAR_MAX_WIDTH,
  TAB_BAR_BTN_SIZE,
  TAB_BAR_CONTAINER_HEIGHT,
  TAB_BAR_NAV_HEIGHT,
} from "@/lib/tab-bar";
import { BorrowRequestBanner } from "@/components/BorrowRequestBannerNative";
import { useRealtimeSync, useIncomingRequestCount, usePendingHandoffs } from "@/hooks";

// Container is taller than the pill so the overlapping button stays within
// the touchable area while visually sitting above the navbar.

function FloatingTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  notificationCount,
}: BottomTabBarProps & { notificationCount: number }) {
  const insets = useSafeAreaInsets();
  // On a phone the bar spans the screen less a 12pt margin; on an iPad it's a centred pill
  // no wider than TAB_BAR_MAX_WIDTH, so the four tabs don't drift to the far edges.
  const { width: screenWidth } = useWindowDimensions();
  const barSide = Math.max(12, (screenWidth - TAB_BAR_MAX_WIDTH) / 2);
  // On browsing screens the ad bar docks at the bottom edge and the tab bar
  // lifts to sit just above it (0 when no ad is showing). Hidden while a
  // screen is open over the tabs, so the ad never loads out of sight.
  const tabsFocused = useIsFocused();
  const focusedTab = state.routes[state.index];
  const nestedScreen = focusedTab ? getFocusedRouteNameFromRoute(focusedTab) : undefined;
  const adVisible = tabsFocused && isAdScreen(focusedTab?.name, nestedScreen);
  const lift = useAdBarLift(adVisible);
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
    const showBadge = route.name === "settings" && notificationCount > 0;
    const onPress = () => {
      const event = emitter.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) navigateToTab(route.key);
    };
    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        hitSlop={{ top: 20, bottom: 20, left: 8, right: 8 }}
        style={{
          flex: 1,
          height: TAB_BAR_NAV_HEIGHT,
          alignItems: "center",
          justifyContent: "center",
          ...Platform.select({ web: { cursor: "pointer" } as object }),
        }}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
      >
        <View>
          {options.tabBarIcon?.({
            focused: isFocused,
            color: isFocused ? "#00BFA6" : "#6B7280",
            size: 24,
          })}
          {showBadge && (
            <View
              style={{
                position: "absolute",
                top: -3,
                right: -6,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                paddingHorizontal: 3,
                backgroundColor: "#EF4444",
                borderWidth: 1.5,
                borderColor: "#101828",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 10,
                  lineHeight: 12,
                  fontWeight: "700",
                }}
              >
                {notificationCount > 9 ? "9+" : notificationCount}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    // Outer wrapper — only exists to let the center button overflow above the pill.
    // box-none: the wrapper itself won't intercept events; only its children will.
    <>
    <AdBar lift={lift} visible={adVisible} />
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: insets.bottom + TAB_BAR_BOTTOM_GAP,
        left: barSide,
        right: barSide,
        height: TAB_BAR_CONTAINER_HEIGHT,
        zIndex: 999,
        transform: [{ translateY: Animated.multiply(lift, -1) }],
      }}
    >
      {/* Pill + tab buttons in one element — visual and hit targets are identical */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: TAB_BAR_NAV_HEIGHT,
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
        <View style={{ width: TAB_BAR_BTN_SIZE + 16 }} />
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
            width: TAB_BAR_BTN_SIZE,
            height: TAB_BAR_BTN_SIZE,
            borderRadius: TAB_BAR_BTN_SIZE / 2,
            backgroundColor: THEME.light.primaryStrong,
            borderWidth: 4,
            borderColor: "white",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: THEME.light.primaryStrong,
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
    </Animated.View>
    </>
  );
}

export default function TabLayout() {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const insets = useSafeAreaInsets();
  const [bannerDismissed, setBannerDismissed] = React.useState(false);

  // Single source of truth for all realtime DB updates
  useRealtimeSync();

  // Request count from cache — updates automatically via useRealtimeSync
  const requestCount = useIncomingRequestCount();
  // Items awaiting this user's pickup/return confirmation — a second
  // "needs your action" source alongside incoming borrow requests.
  const { items: pendingHandoffs } = usePendingHandoffs();
  const notificationCount = requestCount + pendingHandoffs.length;

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
        tabBar={(props) => (
          <FloatingTabBar {...props} notificationCount={notificationCount} />
        )}
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

    </View>
  );
}
