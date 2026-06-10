/**
 * BorrowRequestsSection Component
 *
 * Displays incoming borrow requests for the library screen
 */

import { View, Alert, ActivityIndicator, Platform } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import * as LucideIcons from "lucide-react-native";
import { formatDistanceToNow } from "date-fns";
import { getInitials } from "@/lib/utils";
import { resolveAvatarSource } from "@/lib/services/avatar";
import type { BorrowRequestWithDetails } from "@/lib/types";
import { CategoryBadge } from "./CategoryBadge";

interface BorrowRequestsSectionProps {
  requests: BorrowRequestWithDetails[];
  onApprove: (requestId: string) => void;
  onDeny: (requestId: string) => void;
  processingId?: string;
}

export function BorrowRequestsSection({
  requests,
  onApprove,
  onDeny,
  processingId,
}: BorrowRequestsSectionProps) {
  if (!requests || requests.length === 0) {
    return null;
  }

  const handleApprove = (request: BorrowRequestWithDetails) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Allow ${request.requesterName} to borrow "${request.itemName}"?`
      );
      if (confirmed) {
        onApprove(request.id);
      }
    } else {
      Alert.alert(
        'Approve Request',
        `Allow ${request.requesterName} to borrow "${request.itemName}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Approve',
            onPress: () => { onApprove(request.id); },
          },
        ]
      );
    }
  };

  const handleDeny = (request: BorrowRequestWithDetails) => {
    if (Platform.OS === 'web') {
      // Use window.confirm on web
      const confirmed = window.confirm(
        `Deny ${request.requesterName}'s request to borrow "${request.itemName}"?`
      );
      if (confirmed) {
        onDeny(request.id);
      }
    } else {
      // Use Alert.alert on mobile
      Alert.alert(
        'Deny Request',
        `Deny ${request.requesterName}'s request to borrow "${request.itemName}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deny',
            style: 'destructive',
            onPress: () => onDeny(request.id),
          },
        ]
      );
    }
  };

  return (
    <View className="gap-3 pb-4">
      {/* Section Header */}
      <View className="pt-4">
        <Text variant="h3" className="font-semibold">
          Incoming Borrow Requests
        </Text>
        <Text variant="small" className="text-muted-foreground mt-1">
          {requests.length} {requests.length === 1 ? 'request' : 'requests'}
        </Text>
      </View>

      {/* Request Cards */}
      {requests.map((request) => {
        const isProcessing = processingId === request.id;
        const itemImage = request.itemImages?.[0];

        return (
          <View
            key={request.id}
            className="bg-card border border-border rounded-lg p-3 gap-3"
          >
            <View className="flex-row gap-3">
              {/* Item Thumbnail */}
              <View className="w-16 h-16 bg-muted rounded-lg items-center justify-center overflow-hidden">
                {itemImage ? (
                  <Image
                    source={{ uri: itemImage }}
                    style={{ width: 64, height: 64 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <LucideIcons.Package size={32} color="#9ca3af" />
                )}
              </View>

              {/* Request Details */}
              <View className="flex-1 gap-2">
                {/* Item Name and Category */}
                <View className="gap-1">
                  <Text className="font-semibold">
                    {request.itemName}
                  </Text>
                  <CategoryBadge category={request.itemCategory} size="small" />
                </View>

                {/* User Info */}
                <View className="flex-row gap-2 items-center">
                  <Avatar className="w-6 h-6" alt={request.requesterName}>
                    {request.requesterAvatarUrl ? (
                      <AvatarImage source={resolveAvatarSource(request.requesterAvatarUrl) ?? { uri: '' }} />
                    ) : (
                      <AvatarFallback>
                        <Text variant="small" className="text-xs">
                          {getInitials(request.requesterName)}
                        </Text>
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <Text variant="small" className="text-muted-foreground">
                    Requested by {request.requesterName}
                  </Text>
                </View>

                {/* Optional Message */}
                {request.message && (
                  <View className="bg-muted p-2 rounded border-l-2 border-blue-500">
                    <Text variant="small" className="italic">
                      "{request.message}"
                    </Text>
                  </View>
                )}

                {/* Requested Due Date */}
                {request.requestedDueDate && (
                  <Text variant="small" className="text-muted-foreground">
                    Requested return: {new Date(request.requestedDueDate).toLocaleDateString()}
                  </Text>
                )}

                {/* Timestamp */}
                <Text variant="small" className="text-muted-foreground">
                  {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-2">
              {isProcessing ? (
                <View className="flex-1 items-center py-2">
                  <ActivityIndicator size="small" />
                </View>
              ) : (
                <>
                  <Button
                    variant="destructive-outline"
                    onPress={() => handleDeny(request)}
                    className="flex-1"
                  >
                    <Text>Deny</Text>
                  </Button>
                  <Button
                    onPress={() => handleApprove(request)}
                    className="flex-1"
                  >
                    <Text>Approve</Text>
                  </Button>
                </>
              )}
            </View>
          </View>
        );
      })}

      <Separator className="mt-1" />
    </View>
  );
}
