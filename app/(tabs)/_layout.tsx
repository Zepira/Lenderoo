import * as React from "react";
import { View, Pressable } from "react-native";
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
import { THEME } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { show } from "@/lib/toast";
import { BorrowRequestBanner } from "@/components/BorrowRequestBannerNative";
import { getIncomingRequestCount } from "@/lib/borrow-requests-service";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { FeedbackModal } from "@/components/FeedbackModal";

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
    (r) => descriptors[r.key]?.options?.tabBarIcon !== undefined
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
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
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
    <View
      style={{
        position: "absolute",
        bottom: insets.bottom + 8,
        left: 12,
        right: 12,
        height: CONTAINER_HEIGHT,
      }}
    >
      {/* Pill */}
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
        {/* Left group — guaranteed equal width to right group */}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {leftRoutes.map((route, i) => renderTab(route, i))}
        </View>
        {/* Gap for the center button */}
        <View style={{ width: BTN_SIZE + 16 }} />
        {/* Right group */}
        <View
          style={{
            flex: 1,
            flexGrow: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-evenly",
          }}
        >
          {rightRoutes.map((route, i) => renderTab(route, i + half))}
        </View>
      </View>

      {/* Center add button — overlaps the top of the pill */}
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
            elevation: 14,
            shadowColor: "#00BFA6",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
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
  const { user } = useAuth();
  const [requestCount, setRequestCount] = React.useState(0);
  const [bannerDismissed, setBannerDismissed] = React.useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = React.useState(false);

  // Memoize the header right component to prevent recreation
  const HeaderRight = React.useCallback(() => <ThemeSwitcher />, []);

  // Load incoming request count
  React.useEffect(() => {
    if (!user) return;

    loadRequestCount();
  }, [user]);

  const loadRequestCount = async () => {
    try {
      const count = await getIncomingRequestCount();
      setRequestCount(count);
      if (count > 0) {
        setBannerDismissed(false); // Show banner if new requests
      }
    } catch (error) {
      console.error("Error loading request count:", error);
    }
  };

  // Subscribe to borrow request changes
  React.useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("borrow-requests-banner")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "borrow_requests",
          filter: `owner_id=eq.${user.id}`,
        },
        () => {
          loadRequestCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
