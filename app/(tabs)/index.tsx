import { useMemo } from "react";
import {
  View,
  ScrollView,
  Image,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { useActiveItems, useBorrowedByMeItems, useItems } from "hooks/useItems";
import { useFriends } from "hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import type { Item } from "lib/types";

export default function HomeScreen() {
  const { appUser } = useAuth();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  const {
    items: lentOutItems,
    loading: lentLoading,
    refresh: refreshLent,
  } = useActiveItems();
  const {
    items: borrowedItems,
    loading: borrowedLoading,
    refresh: refreshBorrowed,
  } = useBorrowedByMeItems();
  const { items: allItems } = useItems();
  const { friends } = useFriends();

  const loading = lentLoading || borrowedLoading;

  const friendsMap = useMemo(
    () =>
      friends.reduce(
        (acc, f) => ({ ...acc, [f.id]: f }),
        {} as Record<string, (typeof friends)[0]>,
      ),
    [friends],
  );

  const firstName = appUser?.name?.split(" ")[0] ?? "there";

  const refresh = async () => {
    await Promise.all([refreshLent(), refreshBorrowed()]);
  };

  const getLentPersonName = (item: Item) =>
    item.borrowedBy
      ? (friendsMap[item.borrowedBy]?.name ?? "Someone")
      : "Someone";

  const getBorrowedPersonName = (item: Item) =>
    friendsMap[item.userId]?.name ?? "Someone";

  return (
    <View
      style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={THEME.light.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 40,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <SafeAreaView edges={["top"]}>
            <View
              style={{
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: 28,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text
                    className="font-display-bold text-foreground"
                    style={{ fontSize: 30, lineHeight: 40 }}
                  >
                    Hi {firstName}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 4,
                      gap: 8,
                    }}
                  >
                    <Text
                      className="font-sans-bold text-muted-foreground"
                      style={{ fontSize: 12 }}
                    >
                      {borrowedItems.length} borrowed
                    </Text>
                    <Text
                      className="text-primary font-sans-bold"
                      style={{ fontSize: 12 }}
                    >
                      •
                    </Text>
                    <Text
                      className="font-sans-bold text-muted-foreground"
                      style={{ fontSize: 12 }}
                    >
                      {lentOutItems.length} lent
                    </Text>
                  </View>
                </View>

                {/* Profile avatar */}
                <Pressable
                  onPress={() => router.push("/(tabs)/settings")}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    overflow: "hidden",
                    borderWidth: 2,
                    borderColor: THEME.light.primary + "33",
                    backgroundColor: theme.muted,
                  }}
                >
                  {appUser?.avatarUrl ? (
                    <Image
                      source={{ uri: appUser.avatarUrl }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: THEME.light.primary + "22",
                      }}
                    >
                      <Text
                        className="font-sans-bold text-primary"
                        style={{ fontSize: 18 }}
                      >
                        {firstName[0]?.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* Stats grid */}
        <View style={{ paddingHorizontal: 24, marginTop: 28 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatCard
              label="In Library"
              value={allItems.length}
              unit="Total items"
            />
            <StatCard
              label="Lent Out"
              value={lentOutItems.length}
              unit="Right now"
            />
            <StatCard
              label="Borrowed"
              value={borrowedItems.length}
              unit="By me"
            />
          </View>
        </View>

        {/* Sections */}
        <View style={{ paddingHorizontal: 24, marginTop: 36, gap: 36 }}>
          {loading &&
          borrowedItems.length === 0 &&
          lentOutItems.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={THEME.light.primary} />
            </View>
          ) : (
            <>
              <DashboardSection
                title="Borrowed"
                items={borrowedItems}
                type="borrowed"
                getPersonName={getBorrowedPersonName}
                onItemPress={(item) =>
                  router.push(`/library/${item.id}` as any)
                }
                onViewAll={() => router.push("/(tabs)/library")}
              />
              <DashboardSection
                title="Lent Out"
                items={lentOutItems}
                type="lent"
                getPersonName={getLentPersonName}
                onItemPress={(item) =>
                  router.push(`/library/${item.id}` as any)
                }
                onViewAll={() => router.push("/(tabs)/library")}
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
