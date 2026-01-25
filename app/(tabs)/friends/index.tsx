import { View } from "react-native";
import { router } from "expo-router";
import { Plus } from "lucide-react-native";
import { FriendList } from "components/FriendList";
import { useFriends } from "hooks/useFriends";
import { Button } from "@/components/ui/button";

export default function FriendsScreen() {
  const { friends, loading, refresh } = useFriends();

  const handleFriendPress = (friend: (typeof friends)[0]) => {
    router.push(`/friends/${friend.id}` as any);
  };

  const handleAddFriend = () => {
    router.push("/add-friend");
  };

  return (
    <View className="flex-1 bg-background">
      <FriendList
        friends={friends}
        onFriendPress={handleFriendPress}
        onRefresh={refresh}
        loading={loading}
        detailed
        emptyState={{
          title: "No friends yet",
          message: "Add friends to start lending them items",
          actionLabel: "Add Your First Friend",
          onAction: handleAddFriend,
        }}
      />

      {/* Floating Action Button */}
      {friends.length > 0 && (
        <Button
          size="icon"
          className="absolute bottom-6 right-4 w-14 h-14 rounded-full shadow-lg"
          onPress={handleAddFriend}
        >
          <Plus size={24} />
        </Button>
      )}
    </View>
  );
}
