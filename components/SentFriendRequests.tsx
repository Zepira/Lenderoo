/**
 * Sent Friend Requests Component
 *
 * Shows outgoing friend requests the current user has sent that haven't
 * been responded to yet, with a way to cancel them.
 */

import { View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { X, Clock } from "lucide-react-native";
import { useState } from "react";
import * as toast from "@/lib/toast";
import {
  cancelSentFriendRequest,
  type FriendRequest,
} from "@/lib/services/friends";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";

interface SentFriendRequestsProps {
  requests: FriendRequest[];
  onUpdate: () => void;
}

export function SentFriendRequests({
  requests,
  onUpdate,
}: SentFriendRequestsProps) {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const [processing, setProcessing] = useState<string | null>(null);

  async function handleCancel(requestId: string, userName: string) {
    try {
      setProcessing(requestId);
      await cancelSentFriendRequest(requestId);
      toast.success(`Request to ${userName} cancelled`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel request");
    } finally {
      setProcessing(null);
    }
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <View className="gap-3 mb-6">
      <Text variant="h4" className="font-bold">
        Sent Requests ({requests.length})
      </Text>

      {requests.map((request) => (
        <View
          key={request.id}
          className="flex-row items-center justify-between p-4 bg-card rounded-lg border border-border"
        >
          <View className="flex-row items-center gap-3 flex-1">
            <View className="bg-muted w-12 h-12 rounded-full items-center justify-center">
              <Clock
                size={22}
                color={THEME[isDark ? "dark" : "light"].mutedForeground}
              />
            </View>
            <View className="flex-1">
              <Text className="font-semibold">{request.userName}</Text>
              <Text variant="small" className="text-muted-foreground">
                Waiting for response
              </Text>
            </View>
          </View>

          {processing === request.id ? (
            <ActivityIndicator size="small" />
          ) : (
            <Button
              size="sm"
              variant="outline"
              onPress={() => handleCancel(request.id, request.userName)}
              className="px-3"
            >
              <X size={18} color="#ef4444" />
            </Button>
          )}
        </View>
      ))}
    </View>
  );
}
