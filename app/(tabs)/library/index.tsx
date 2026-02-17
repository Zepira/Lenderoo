import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { ItemList } from "components/ItemList";
import { BorrowRequestsSection } from "components/BorrowRequestsSection";
import { useItems } from "hooks/useItems";
import { useFriends } from "hooks/useFriends";
import type { ItemStatus, BorrowRequestWithDetails } from "lib/types";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { SafeAreaWrapper } from "@/components/SafeAreaWrapper";
import { getIncomingBorrowRequests, approveBorrowRequest, denyBorrowRequest } from "@/lib/borrow-requests-service";
import { supabase } from "@/lib/supabase";
import * as toast from "@/lib/toast";

type FilterTab = "all" | "available" | "lent";

export default function ItemsScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [incomingRequests, setIncomingRequests] = useState<BorrowRequestWithDetails[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Determine filter based on active tab
  const filter = useMemo(() => {
    if (activeFilter === "available") {
      return { status: "available" as ItemStatus };
    }
    if (activeFilter === "lent") {
      return { status: "borrowed" as ItemStatus };
    }
    return undefined; // All items
  }, [activeFilter]);

  const { items, loading, refresh } = useItems(filter);
  const { friends } = useFriends();

  // Create a map of friend IDs to Friend objects for ItemList
  const friendsMap = useMemo(() => {
    return friends.reduce((acc, friend) => {
      acc[friend.id] = friend;
      return acc;
    }, {} as Record<string, (typeof friends)[0]>);
  }, [friends]);

  const handleItemPress = (item: (typeof items)[0]) => {
    router.push(`/library/${item.id}` as any);
  };

  const handleAddItem = () => {
    router.push("/add-item");
  };

  // Fetch all items once for counting
  const { items: allItems } = useItems();

  // Calculate counts from all items
  const allCount = allItems.length;
  const availableCount = useMemo(() => {
    return allItems.filter((item) => !item.borrowedBy && !item.returnedDate)
      .length;
  }, [allItems]);
  const lentCount = useMemo(() => {
    return allItems.filter((item) => !!item.borrowedBy && !item.returnedDate)
      .length;
  }, [allItems]);

  // Load incoming borrow requests
  useEffect(() => {
    loadIncomingRequests();
  }, []);

  const loadIncomingRequests = async () => {
    try {
      console.log('📥 Loading incoming borrow requests...');
      const requests = await getIncomingBorrowRequests();
      console.log('📥 Loaded requests:', requests.length, requests);
      setIncomingRequests(requests);
    } catch (error) {
      console.error("❌ Error loading borrow requests:", error);
    }
  };

  // Subscribe to borrow request changes
  useEffect(() => {
    let channel: any;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      channel = supabase
        .channel('borrow-requests-library')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'borrow_requests',
          filter: `owner_id=eq.${user.id}`,
        }, () => {
          loadIncomingRequests();
          refresh(); // Refresh items list
        })
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleApproveBorrowRequest = async (requestId: string) => {
    console.log('🟡 handleApproveBorrowRequest called with ID:', requestId);
    try {
      setProcessingId(requestId);
      console.log('🟡 Calling approveBorrowRequest service...');
      await approveBorrowRequest(requestId);
      console.log('🟡 Service call completed, showing success toast');
      toast.success("Request approved!");
      await loadIncomingRequests();
      await refresh(); // Refresh items list
      console.log('🟡 Lists refreshed');
    } catch (error: any) {
      console.error("❌ Error approving request:", error);
      toast.error(error.message || "Failed to approve request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDenyBorrowRequest = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      await denyBorrowRequest(requestId);
      toast.success("Request denied");
      await loadIncomingRequests();
    } catch (error: any) {
      console.error("Error denying request:", error);
      toast.error(error.message || "Failed to deny request");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SafeAreaWrapper>
      {/* Filter Tabs */}
      <View className="flex-row p-3 gap-2 bg-background border-b border-border">
        <Button
          variant={activeFilter === "all" ? "default" : "outline"}
          isSelected={activeFilter === "all"}
          className="flex-auto"
          onPress={() => setActiveFilter("all")}
        >
          <Text>All ({allCount})</Text>
        </Button>
        <Button
          variant={activeFilter === "available" ? "default" : "outline"}
          isSelected={activeFilter === "available"}
          className="flex-auto"
          onPress={() => setActiveFilter("available")}
        >
          <Text>Available ({availableCount})</Text>
        </Button>
        <Button
          variant={activeFilter === "lent" ? "default" : "outline"}
          isSelected={activeFilter === "lent"}
          className="flex-auto"
          onPress={() => setActiveFilter("lent")}
        >
          <Text>Lent Out ({lentCount})</Text>
        </Button>
      </View>

      <ItemList
        items={items}
        friendsMap={friendsMap}
        onItemPress={handleItemPress}
        onRefresh={refresh}
        loading={loading}
        headerComponent={
          <BorrowRequestsSection
            requests={incomingRequests}
            onApprove={handleApproveBorrowRequest}
            onDeny={handleDenyBorrowRequest}
            processingId={processingId || undefined}
          />
        }
        emptyState={{
          title:
            activeFilter === "all"
              ? "No items yet"
              : activeFilter === "available"
              ? "No available items"
              : "No items lent out",
          message:
            activeFilter === "all"
              ? "Start tracking items in your library"
              : activeFilter === "available"
              ? "All your items are currently lent out"
              : "You haven't lent anything out yet",
          actionLabel: "Add an Item",
          onAction: handleAddItem,
        }}
      />
    </SafeAreaWrapper>
  );
}
