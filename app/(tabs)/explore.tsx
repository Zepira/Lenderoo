import { View } from "react-native";
import { router } from "expo-router";
import { Plus } from "lucide-react-native";
import { FriendList } from "components/FriendList";
import { useFriends } from "hooks/useFriends";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Construction } from "lucide-react-native";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { SafeAreaWrapper } from "@/components/SafeAreaWrapper";

export default function FriendsScreen() {
  const { friends, loading, refresh } = useFriends();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";

  const handleFriendPress = (friend: (typeof friends)[0]) => {
    router.push(`/friend/${friend.id}` as any);
  };

  const handleAddFriend = () => {
    router.push("/add-friend");
  };

  return (
    <SafeAreaWrapper>
      <Construction
        size={150}
        color={isDark ? THEME.dark.primary : THEME.light.primary}
      />

      <Text className="h1">This page is under construction.</Text>
    </SafeAreaWrapper>
  );
}
