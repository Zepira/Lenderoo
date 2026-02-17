import { router } from "expo-router";
import { useState, useEffect } from "react";
import { Plus } from "lucide-react-native";
import { FriendList } from "components/FriendList";
import { FriendRequests } from "components/FriendRequests";
import {
  getMyFriends,
  getPendingFriendRequests,
  getFriendItemCounts,
  type FriendRequest,
  type FriendUser,
} from "@/lib/friends-service";
import { Button } from "@/components/ui/button";
import { SafeAreaWrapper } from "@/components/SafeAreaWrapper";
import type { Friend } from "@/lib/types";
import { supabase } from "@/lib/supabase";

// Convert FriendUser to Friend format for FriendList component
function convertToFriendFormat(
  friendUser: FriendUser,
  counts?: { ownedCount: number; borrowedCount: number }
): Friend {
  return {
    id: friendUser.id,
    userId: "", // Not applicable for user-to-user friends
    name: friendUser.name,
    email: friendUser.email,
    phone: undefined,
    avatarUrl: friendUser.avatarUrl,
    totalItemsBorrowed: 0, // Historical count not currently tracked
    currentItemsBorrowed: counts?.borrowedCount || 0,
    ownedItemsCount: counts?.ownedCount || 0,
    createdAt: friendUser.friendsSince,
    updatedAt: friendUser.friendsSince,
  };
}

export default function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Load friends and friend requests
  useEffect(() => {
    loadFriends();
    loadFriendRequests();
  }, []);

  // Set up realtime subscription for friend_connections changes
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setupRealtimeSubscription() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      console.log("🔴 Setting up realtime subscription for user:", user.id);

      // Subscribe to changes in friend_connections table
      channel = supabase
        .channel("friend-connections-changes")
        .on(
          "postgres_changes",
          {
            event: "*", // Listen to INSERT, UPDATE, DELETE
            schema: "public",
            table: "friend_connections",
            filter: `friend_user_id=eq.${user.id}`, // Incoming requests
          },
          (payload) => {
            console.log("🔴 Realtime change detected (incoming):", payload);
            loadFriendRequests();
            loadFriends();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "friend_connections",
            filter: `user_id=eq.${user.id}`, // Outgoing requests & my friendships
          },
          (payload) => {
            console.log("🔴 Realtime change detected (outgoing):", payload);
            loadFriends();
          }
        )
        .subscribe((status) => {
          console.log("🔴 Realtime subscription status:", status);
        });
    }

    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        console.log("🔴 Cleaning up realtime subscription");
        supabase.removeChannel(channel);
      }
    };
  }, []);

  async function loadFriends() {
    try {
      setLoading(true);
      console.log("🔄 Loading friends...");
      const friendsData = await getMyFriends();
      console.log("✅ Friends loaded:", friendsData.length);

      // Fetch item counts for each friend
      const friendsWithCounts = await Promise.all(
        friendsData.map(async (friendUser) => {
          try {
            const counts = await getFriendItemCounts(friendUser.id);
            return convertToFriendFormat(friendUser, counts);
          } catch (error) {
            console.error(`Error loading counts for friend ${friendUser.id}:`, error);
            return convertToFriendFormat(friendUser);
          }
        })
      );

      setFriends(friendsWithCounts);
    } catch (error: any) {
      console.error("❌ Error loading friends:", error);
      console.error("Error details:", error.message, error.details);
    } finally {
      setLoading(false);
    }
  }

  async function loadFriendRequests() {
    try {
      setLoadingRequests(true);
      console.log("🔄 Loading friend requests...");
      const requests = await getPendingFriendRequests();
      console.log("✅ Friend requests loaded:", requests.length);
      setFriendRequests(requests);
    } catch (error: any) {
      console.error("❌ Error loading friend requests:", error);
      console.error("Error details:", error.message, error.details);
    } finally {
      setLoadingRequests(false);
    }
  }

  async function handleRefresh() {
    await Promise.all([loadFriends(), loadFriendRequests()]);
  }

  const handleFriendPress = (friend: (typeof friends)[0]) => {
    router.push(`/friends/${friend.id}` as any);
  };

  const handleAddFriend = () => {
    router.push("/(tabs)/friends/add-user-friend");
  };

  return (
    <SafeAreaWrapper>
      <FriendList
        friends={friends}
        onFriendPress={handleFriendPress}
        onRefresh={handleRefresh}
        refreshing={loading || loadingRequests}
        loading={loading}
        detailed
        emptyState={{
          title: "No friends yet",
          message: "Add friends to start lending them items",
          actionLabel: "Add Your First Friend",
          onAction: handleAddFriend,
        }}
        ListHeaderComponent={
          <FriendRequests requests={friendRequests} onUpdate={handleRefresh} />
        }
        onAddFriend={handleAddFriend}
      />
    </SafeAreaWrapper>
  );
}
