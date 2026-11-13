/**
 * BorrowRequestsSection Component
 *
 * Displays incoming borrow requests for the library screen
 */

import { useEffect, useState } from "react";
import { View, Alert, ActivityIndicator, Platform, Modal, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/ui/text";
import { BodyStrong, Caption } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import * as LucideIcons from "lucide-react-native";
import { formatDistanceToNow } from "date-fns";
import { getInitials } from "@/lib/utils";
import { resolveAvatarSource } from "@/lib/services/avatar";
import { getLoansWithMe, type LoanWithMe } from "@/lib/services/database";
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
  const [historyFor, setHistoryFor] = useState<BorrowRequestWithDetails | null>(null);

  if (!requests || requests.length === 0) {
    return null;
  }

  const handleApprove = (request: BorrowRequestWithDetails) => {
    // Lent out to someone else: approving puts them in the queue (approveBorrowRequest).
    const queued = !!request.itemBorrowedBy && request.itemBorrowedBy !== request.requesterId;
    const title = queued ? 'Approve as next in queue' : 'Approve Request';
    const message = queued
      ? `"${request.itemName}" is lent out at the moment. Let ${request.requesterName} borrow it next? They'll join the queue.`
      : `Allow ${request.requesterName} to borrow "${request.itemName}"?`;
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        onApprove(request.id);
      }
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: queued ? 'Add to queue' : 'Approve',
          onPress: () => { onApprove(request.id); },
        },
      ]);
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
            className="bg-card border border-border rounded-2xl p-3 gap-3"
          >
            <View className="flex-row gap-3">
              {/* Item Thumbnail */}
              {/* Stretches to the height of the details beside it */}
              <View className="w-20 min-h-20 bg-muted rounded-xl items-center justify-center overflow-hidden">
                {itemImage ? (
                  <Image
                    source={{ uri: itemImage }}
                    style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
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
                <View className="gap-1.5">
                  <BodyStrong numberOfLines={2}>{request.itemName}</BodyStrong>
                  <CategoryBadge category={request.itemCategory} size="sm" />
                </View>

                {/* User Info */}
                <View className="flex-row gap-2 items-center">
                  {/* size-6 (not w-/h-) so it replaces Avatar's default size-8.
                      The fallback is always rendered: the primitive shows it
                      whenever the image is missing or fails to load (it hides
                      a failed image, which left a blank space here). */}
                  <Avatar className="size-6" alt={request.requesterName}>
                    {request.requesterAvatarUrl && (
                      <AvatarImage source={resolveAvatarSource(request.requesterAvatarUrl) ?? { uri: '' }} />
                    )}
                    <AvatarFallback className="bg-primary/15">
                      <Text className="font-sans-bold text-primary" style={{ fontSize: 10, lineHeight: 12 }}>
                        {getInitials(request.requesterName)}
                      </Text>
                    </AvatarFallback>
                  </Avatar>
                  <Caption className="flex-1" numberOfLines={1}>
                    Requested by {request.requesterName}
                  </Caption>
                </View>
                <Pressable
                  onPress={() => setHistoryFor(request)}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Caption className="text-primary font-sans-bold">
                    Their history with you
                  </Caption>
                </Pressable>

                {/* Optional Message */}
                {request.message && (
                  <View className="bg-muted px-2.5 py-1.5 rounded-lg border-l-2 border-primary">
                    <Caption className="italic text-foreground">
                      "{request.message}"
                    </Caption>
                  </View>
                )}

                {/* Requested Due Date */}
                {request.requestedDueDate && (
                  <Caption>
                    Requested return: {new Date(request.requestedDueDate).toLocaleDateString()}
                  </Caption>
                )}

                {/* Timestamp */}
                <Caption style={{ fontSize: 12, lineHeight: 16 }}>
                  {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                </Caption>
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
      <BorrowerHistoryModal request={historyFor} onClose={() => setHistoryFor(null)} />
    </View>
  );
}

/** A requester's past and current loans of your items, to decide on their request. */
function BorrowerHistoryModal({
  request,
  onClose,
}: {
  request: BorrowRequestWithDetails | null;
  onClose: () => void;
}) {
  const [loans, setLoans] = useState<LoanWithMe[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!request) return;
    let active = true;
    setLoans(null);
    setFailed(false);
    getLoansWithMe(request.requesterId)
      .then((rows) => active && setLoans(rows))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [request?.requesterId]);

  const now = new Date();
  const late = (l: LoanWithMe) =>
    !!l.dueDate && (l.returnedDate ? l.returnedDate > l.dueDate : now > l.dueDate);
  const summary = loans
    ? loans.length === 0
      ? `${request?.requesterName} hasn't borrowed anything from you yet.`
      : `Borrowed ${loans.length} ${loans.length === 1 ? 'time' : 'times'} from you` +
        (loans.some(late) ? ` · ${loans.filter(late).length} late` : ' · always on time')
    : '';

  return (
    <Modal visible={!!request} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} accessibilityLabel="Close" />
      <View className="bg-background rounded-t-3xl px-5 pt-5 pb-10 gap-3" style={{ maxHeight: '70%' }}>
        <Text variant="h3" className="font-semibold">
          {request?.requesterName}'s history with you
        </Text>
        {failed ? (
          <Caption>Couldn't load their history. Try again in a moment.</Caption>
        ) : !loans ? (
          <ActivityIndicator size="small" />
        ) : (
          <>
            <Caption>{summary}</Caption>
            <ScrollView contentContainerStyle={{ gap: 10 }}>
              {loans.map((l) => (
                <View key={l.id} className="bg-card border border-border rounded-xl p-3 gap-1">
                  <BodyStrong numberOfLines={1}>{l.itemName}</BodyStrong>
                  <Caption>
                    {l.borrowedDate.toLocaleDateString()} –{' '}
                    {l.returnedDate ? l.returnedDate.toLocaleDateString() : 'still has it'}
                    {late(l) ? (l.returnedDate ? ' · returned late' : ' · overdue') : ''}
                  </Caption>
                </View>
              ))}
            </ScrollView>
          </>
        )}
        <Button variant="outline" onPress={onClose}>
          <Text>Close</Text>
        </Button>
      </View>
    </Modal>
  );
}
