import { router } from "expo-router";
import { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ChevronRight,
  Plus,
  Search,
  Users,
} from "lucide-react-native";
import {
  getMyFriends,
  getPendingFriendRequests,
  getFriendItemCounts,
  type FriendRequest,
  type FriendUser,
} from "@/lib/friends-service";
import { FriendRequests } from "components/FriendRequests";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import {
  PageTitle,
  BodyStrong,
  LabelStrong,
  Caption,
} from "@/components/ui/typography";
import { supabase } from "@/lib/supabase";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { resolveAvatarSource } from "@/lib/avatar-service";

export default function FriendsScreen() {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setup() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel("friend-connections-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "friend_connections",
            filter: `friend_user_id=eq.${user.id}`,
          },
          () => {
            loadFriendRequests();
            loadFriends();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "friend_connections",
            filter: `user_id=eq.${user.id}`,
          },
          () => loadFriends(),
        )
        .subscribe();
    }

    setup();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function loadFriends() {
    try {
      setLoading(true);
      const data = await getMyFriends();
      setFriends(data);

      // Load item counts in background
      const counts: Record<string, number> = {};
      await Promise.all(
        data.map(async (f) => {
          try {
            const c = await getFriendItemCounts(f.id);
            counts[f.id] = (c.ownedCount ?? 0) + (c.borrowedCount ?? 0);
          } catch {
            counts[f.id] = 0;
          }
        }),
      );
      setItemCounts(counts);
    } catch (error) {
      console.error("Error loading friends:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFriendRequests() {
    try {
      const requests = await getPendingFriendRequests();
      setFriendRequests(requests);
    } catch (error) {
      console.error("Error loading requests:", error);
    }
  }

  const filtered = friends.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header card */}
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
            marginBottom: 24,
          }}
        >
          <SafeAreaView
            edges={["top"]}
            style={{ backgroundColor: "transparent" }}
          >
            <View
              style={{
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: 28,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
              >
                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: isDark ? theme.muted : "#F3F4F6",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <ArrowLeft size={22} color={theme.mutedForeground} />
                </Pressable>
                <PageTitle>My Friends</PageTitle>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <View style={{ paddingHorizontal: 24, gap: 16 }}>
          {/* Pending friend requests */}
          {friendRequests.length > 0 && (
            <FriendRequests
              requests={friendRequests}
              onUpdate={() => {
                loadFriends();
                loadFriendRequests();
              }}
            />
          )}

          {/* Search */}
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 24,
              padding: 12,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isDark ? theme.muted : "#F3F4F6",
                borderRadius: 16,
                paddingHorizontal: 14,
                gap: 10,
              }}
            >
              <Search size={18} color={theme.mutedForeground} />
              <TextInput
                placeholder="Search friends…"
                placeholderTextColor={theme.mutedForeground}
                value={search}
                onChangeText={setSearch}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: theme.foreground,
                }}
              />
            </View>
          </View>

          {/* Friends list */}
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={THEME.light.primary} />
            </View>
          ) : filtered.length === 0 ? (
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 24,
                padding: 32,
                alignItems: "center",
                gap: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Users size={40} color={theme.mutedForeground} />
              <Caption className="text-center" style={{ fontSize: 14 }}>
                {search ? "No friends match your search" : "No friends yet"}
              </Caption>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {filtered.map((friend) => (
                <Pressable
                  key={friend.id}
                  onPress={() => router.push(`/friends/${friend.id}` as any)}
                  style={({ pressed }) => ({
                    backgroundColor: theme.card,
                    borderRadius: 24,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderWidth: 1,
                    borderColor: theme.border,
                    opacity: pressed ? 0.7 : 1,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 2,
                  })}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        overflow: "hidden",
                        backgroundColor: THEME.light.primary + "22",
                      }}
                    >
                      {resolveAvatarSource(friend.avatarUrl) ? (
                        <Image
                          source={resolveAvatarSource(friend.avatarUrl)!}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            flex: 1,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <BodyStrong
                            className="text-primary"
                            style={{ fontSize: 18, lineHeight: 24 }}
                          >
                            {friend.name[0]?.toUpperCase()}
                          </BodyStrong>
                        </View>
                      )}
                    </View>
                    <View>
                      <BodyStrong>{friend.name}</BodyStrong>
                      <LabelStrong
                        className="text-muted-foreground"
                        style={{ marginTop: 1 }}
                      >
                        {itemCounts[friend.id] ?? 0} items shared
                      </LabelStrong>
                    </View>
                  </View>
                  <ChevronRight size={18} color={theme.border} />
                </Pressable>
              ))}
            </View>
          )}

          {/* Add friend button */}
          <Button onPress={() => router.push("/(tabs)/friends/add-user-friend")}>
            <Plus size={18} color="#fff" />
            <Text>Add New Friend</Text>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
