/**
 * Friend Requests Component
 *
 * Displays pending friend requests with approve/deny buttons
 */

import { View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Check, X, User } from "lucide-react-native";
import { useState } from "react";
import * as toast from "@/lib/toast";
import {
  approveFriendRequest,
  denyFriendRequest,
  type FriendRequest,
} from "@/lib/friends-service";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";

interface FriendRequestsProps {
  requests: FriendRequest[];
  onUpdate: () => void;
}

export function FriendRequests({ requests, onUpdate }: FriendRequestsProps) {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const [processing, setProcessing] = useState<string | null>(null);

  async function handleApprove(requestId: string, userName: string) {
    try {
      setProcessing(requestId);
      await approveFriendRequest(requestId);
      toast.success(`You are now friends with ${userName}!`);
      onUpdate();
    } catch (error: any) {
      console.error("Error approving friend request:", error);
      toast.error(error.message || "Failed to approve request");
    } finally {
      setProcessing(null);
    }
  }

  async function handleDeny(requestId: string, userName: string) {
    try {
      setProcessing(requestId);
      await denyFriendRequest(requestId);
      toast.success(`Declined request from ${userName}`);
      onUpdate();
    } catch (error: any) {
      console.error("Error denying friend request:", error);
      toast.error(error.message || "Failed to deny request");
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
        Friend Requests ({requests.length})
      </Text>

      {requests.map((request) => (
        <View
          key={request.id}
          className="flex-row items-center justify-between p-4 bg-card rounded-lg border border-border"
        >
          <View className="flex-row items-center gap-3 flex-1">
            <View className="bg-primary/10 w-12 h-12 rounded-full items-center justify-center">
              <User size={24} color={THEME[isDark ? "dark" : "light"].primary} />
            </View>
            <View className="flex-1">
              <Text variant="base" className="font-semibold">
                {request.userName}
              </Text>
              <Text variant="small" className="text-muted-foreground">
                {request.userEmail}
              </Text>
            </View>
          </View>

          {processing === request.id ? (
            <ActivityIndicator size="small" />
          ) : (
            <View className="flex-row gap-2">
              <Button
                size="sm"
                variant="outline"
                onPress={() => handleDeny(request.id, request.userName)}
                className="px-3"
              >
                <X size={18} color="#ef4444" />
              </Button>
              <Button
                size="sm"
                onPress={() => handleApprove(request.id, request.userName)}
                className="px-3"
              >
                <Check size={18} color="#fff" />
              </Button>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
