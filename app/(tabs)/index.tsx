import {
  View,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHero, LabelStrong } from "@/components/ui/typography";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useActiveItems, useBorrowedByMeItems, useItems } from "hooks/useItems";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ErrorState } from "@/components/ErrorState";

export default function HomeScreen() {
  const { appUser } = useAuth();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  const {
    items: lentOutItems,
    loading: lentLoading,
    error: lentError,
    refresh: refreshLent,
  } = useActiveItems();
  const {
    items: borrowedItems,
    loading: borrowedLoading,
    error: borrowedError,
    refresh: refreshBorrowed,
  } = useBorrowedByMeItems();
  const { items: allItems, error: allError, refresh: refreshAll } = useItems();

  const loading = lentLoading || borrowedLoading;
  const error = lentError || borrowedError || allError;

  const firstName = appUser?.name?.split(" ")[0] ?? "there";

  const refresh = async () => {
    await Promise.all([refreshLent(), refreshBorrowed(), refreshAll()]);
  };

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refreshLent, refreshBorrowed, refreshAll]),
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: isDark ? theme.background : "#ffffff" }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={THEME.light.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {/* Header — no top radius so pull-down shows white, not grey */}
        <View
          style={{
            backgroundColor: theme.card,
            borderBottomLeftRadius: 40,
            borderBottomRightRadius: 40,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 4,
            overflow: "hidden",
          }}
        >
          <SafeAreaView edges={["top"]}>
            <View
              style={{
                paddingTop: 20,
                paddingBottom: 36,
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
              }}
            >
              {/* Left: greeting */}
              <View style={{ flex: 1, paddingLeft: 24 }}>
                <PageHero>Hi {firstName}</PageHero>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 4,
                    gap: 8,
                  }}
                >
                  <LabelStrong className="text-muted-foreground">
                    {borrowedItems.length} borrowed
                  </LabelStrong>
                  <LabelStrong className="text-primary">•</LabelStrong>
                  <LabelStrong className="text-muted-foreground">
                    {lentOutItems.length} lent
                  </LabelStrong>
                </View>
              </View>

              {/* Right: kangaroo mascot — hugs the right edge */}
              <Image
                source={require("../../assets/images/kangaroo.png")}
                style={{
                  width: 200,
                  height: 200,
                  marginRight: -30,
                  marginBottom: -60,
                  marginTop: -60,
                }}
                resizeMode="contain"
              />
            </View>
          </SafeAreaView>
        </View>

        {error && !loading && (
          <ErrorState
            message="Couldn't load your items. Pull down to retry."
            onRetry={refresh}
          />
        )}

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
                onItemPress={(item) => router.push(`/item/${item.id}` as any)}
                onViewAll={() => router.push("/(tabs)/library")}
              />
              <DashboardSection
                title="Lent Out"
                items={lentOutItems}
                onItemPress={(item) => router.push(`/item/${item.id}` as any)}
                onViewAll={() => router.push("/(tabs)/library")}
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
