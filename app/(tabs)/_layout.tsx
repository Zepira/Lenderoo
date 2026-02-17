import * as React from "react";
import { View } from "react-native";
import { router, Tabs } from "expo-router";
import {
  Users,
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
      .channel('borrow-requests-banner')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'borrow_requests',
        filter: `owner_id=eq.${user.id}`,
      }, () => {
        loadRequestCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleBannerPress = () => {
    router.push('/(tabs)/library');
  };

  const handleBannerDismiss = () => {
    setBannerDismissed(true);
  };

  const screenOptions = React.useMemo(
    () => ({
      tabBarActiveTintColor: isDark ? THEME.dark.primary : THEME.light.primary,
      tabBarInactiveTintColor: isDark
        ? THEME.dark.mutedForeground
        : THEME.light.mutedForeground,
      tabBarStyle: {
        paddingTop: 8,
        paddingBottom: insets.bottom,
        height: 60 + insets.bottom,
        backgroundColor: isDark
          ? THEME.dark.background
          : THEME.light.background,
        borderTopColor: isDark ? THEME.dark.border : THEME.light.border,
      },
      // headerShadowVisible: false,
      // headerStyle: {
      //   backgroundColor: isDark
      //     ? THEME.dark.background
      //     : THEME.light.background,
      // },
      // headerTintColor: isDark ? THEME.dark.foreground : THEME.light.foreground,
      // headerRight: HeaderRight,
      // headerBackVisible: true,
      headerShown: false,
    }),
    [isDark, insets.bottom]
  );

  const handleAddItem = () => {
    router.push("/add-item");
  };

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

      <Tabs screenOptions={screenOptions}>
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
          name="friends"
          options={{
            title: "Friends",
            tabBarIcon: ({ color, size }) => (
              <Users color={color} size={size} />
            ),
            headerTitle: "Friends",
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
      </Tabs>

      {/* Feedback Button - Above the FAB */}
      <Button
        size="icon"
        variant="outline"
        className="absolute right-4 w-14 h-14 rounded-full shadow-lg bg-background border-2 border-border items-center justify-center"
        style={{
          elevation: 6,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
          bottom: insets.bottom + 160,
        }}
        onPress={handleFeedbackPress}
      >
        <MessageSquare
          size={22}
          color={isDark ? THEME.dark.foreground : THEME.light.foreground}
        />
      </Button>

      {/* Floating Action Button - Appears over all tabs */}
      <Button
        size="icon"
        className="absolute  right-4 w-16 h-16 rounded-full shadow-2xl  bg-primary items-center justify-center"
        style={{
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          bottom: insets.bottom + 80,
        }}
        onPress={handleAddItem}
      >
        <Plus size={28} />
      </Button>

      {/* Feedback Modal */}
      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
      />
    </View>
  );
}
