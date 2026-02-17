/**
 * BorrowRequestBanner Component (NativeWind version)
 *
 * Top-of-app notification banner for incoming borrow requests
 */

import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import * as LucideIcons from "lucide-react-native";

interface BorrowRequestBannerProps {
  count: number;
  onPress: () => void;
  onDismiss: () => void;
}

export function BorrowRequestBanner({
  count,
  onPress,
  onDismiss,
}: BorrowRequestBannerProps) {
  if (count === 0) {
    return null;
  }

  return (
    <Pressable
      onPress={onPress}
      className="bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800 px-4 py-3 flex-row items-center gap-3"
      style={{ opacity: 1 }}
    >
      {/* Icon */}
      <LucideIcons.Bell size={20} color="#3b82f6" />

      {/* Message */}
      <View className="flex-1">
        <Text className="font-semibold text-blue-900 dark:text-blue-100">
          {count} {count === 1 ? 'Borrow Request' : 'Borrow Requests'}
        </Text>
        <Text variant="small" className="text-blue-700 dark:text-blue-300">
          Tap to view and respond
        </Text>
      </View>

      {/* Dismiss Button */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="p-2 rounded-full"
      >
        <LucideIcons.X size={20} color="#3b82f6" />
      </Pressable>
    </Pressable>
  );
}
