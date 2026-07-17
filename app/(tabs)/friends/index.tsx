import { router, useFocusEffect } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  ChevronRight,
  Plus,
  Users,
} from "lucide-react-native";
import {
  getMyFriends,
  getPendingFriendRequests,
  getSentPendingFriendRequests,
  getFriendItemCounts,
  type FriendRequest,
  type FriendUser,
} from "@/lib/services/friends";
import { FriendRequests } from "components/FriendRequests";
import { SentFriendRequests } from "components/SentFriendRequests";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import {
  BodyStrong,
  LabelStrong,
  Caption,
} from "@/components/ui/typography";
import { supabase } from "@/lib/supabase";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { resolveAvatarSource } from "@/lib/services/avatar";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CardSearchInput } from "@/components/CardSearchInput";
import { subscribeLogged } from "@/lib/realtime";

export default function FriendsScreen() {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentFriendRequests, setSentFriendRequests] = useState<FriendRequest[]>(
    [],
  );
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  // Tab screens stay mounted once visited (expo-router doesn't unmount on
  // tab switch), so a mount-only effect only ever fetches once per app
  // session. Pending requests then depend entirely on the realtime
  // subscription below to ever appear — and that can silently miss events
  // (dropped while backgrounded, reconnect races), which is how someone can
  // get a "new friend request" push, open the app, and see nothing until a
  // cold restart. Refetch on every focus instead, so returning to this tab
  // (including via tapping the notification) is always accurate.
  useFocusEffect(
    useCallback(() => {
      loadFriends();
      loadFriendRequests();
      loadSentFriendRequests();
    }, []),
  );

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setup() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = subscribeLogged(
        supabase
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
            () => {
              loadFriends();
              loadSentFriendRequests();
            },
          ),
        "friend-connections-changes",
      );
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

  async function loadSentFriendRequests() {
    try {
      const requests = await getSentPendingFriendRequests();
      setSentFriendRequests(requests);
    } catch (error) {
      console.error("Error loading sent requests:", error);
    }
  }

  const filtered = friends.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleRefresh = useCallback(() => {
    loadFriends();
    loadFriendRequests();
    loadSentFriendRequests();
  }, []);

  return (
    <View
      style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}
    >
      <ScreenHeader title="My Friends" showBack onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 24, gap: 16 }}>
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

          {/* Requests I've sent that are still awaiting a response */}
          {sentFriendRequests.length > 0 && (
            <SentFriendRequests
              requests={sentFriendRequests}
              onUpdate={loadSentFriendRequests}
            />
          )}

          <CardSearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search friends…"
          />

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
