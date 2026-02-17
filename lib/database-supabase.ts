/**
 * Supabase Database Service
 *
 * Handles all CRUD operations for items, friends, and history using Supabase
 */

import { supabase } from "./supabase";
import type {
  Item,
  Friend,
  BorrowHistory,
  ItemFilters,
  FriendFilters,
} from "./types";

// ============================================================================
// Type Conversion Helpers
// ============================================================================

/**
 * Convert snake_case DB columns to camelCase TypeScript
 */
function convertFriendFromDb(data: any): Friend {
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    avatarUrl: data.avatar_url,
    totalItemsBorrowed: data.total_items_borrowed,
    currentItemsBorrowed: data.current_items_borrowed,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

function convertItemFromDb(data: any): Item {
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    description: data.description,
    category: data.category,
    images: data.images,
    borrowedBy: data.borrowed_by,
    borrowedDate: data.borrowed_date ? new Date(data.borrowed_date) : undefined,
    dueDate: data.due_date ? new Date(data.due_date) : undefined,
    returnedDate: data.returned_date ? new Date(data.returned_date) : undefined,
    notes: data.notes,
    metadata: data.metadata,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

function convertHistoryFromDb(data: any): BorrowHistory {
  return {
    id: data.id,
    itemId: data.item_id,
    friendId: data.friend_id,
    borrowedDate: new Date(data.borrowed_date),
    returnedDate: data.returned_date ? new Date(data.returned_date) : undefined,
    dueDate: data.due_date ? new Date(data.due_date) : undefined,
    notes: data.notes,
    createdAt: new Date(data.created_at),
  };
}

// ============================================================================
// Auth Helper
// ============================================================================

/**
 * Get the current user ID from Supabase Auth
 */
async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No authenticated user");
  return user.id;
}

// ============================================================================
// Items Service
// ============================================================================

export async function getAllItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(convertItemFromDb);
}

export async function getItemById(id: string): Promise<Item | null> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data ? convertItemFromDb(data) : null;
}

export async function createItem(
  itemData: Omit<Item, "id" | "createdAt" | "updatedAt">
): Promise<Item> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("items")
    .insert([
      {
        user_id: userId,
        name: itemData.name,
        description: itemData.description,
        category: itemData.category,
        images: itemData.images,
        borrowed_by: itemData.borrowedBy,
        borrowed_date: itemData.borrowedDate?.toISOString(),
        due_date: itemData.dueDate?.toISOString(),
        returned_date: itemData.returnedDate?.toISOString(),
        notes: itemData.notes,
        metadata: itemData.metadata,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  // Update friend's borrow count if item is being lent
  if (itemData.borrowedBy) {
    await incrementFriendBorrowCount(itemData.borrowedBy);
  }

  return convertItemFromDb(data);
}

export async function updateItem(
  id: string,
  updates: Partial<Item>
): Promise<Item | null> {
  // Get the old item first to compare borrowedBy
  const oldItem = await getItemById(id);
  if (!oldItem) return null;

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.images !== undefined) updateData.images = updates.images;
  if (updates.borrowedBy !== undefined)
    updateData.borrowed_by = updates.borrowedBy;
  if (updates.borrowedDate !== undefined)
    updateData.borrowed_date = updates.borrowedDate?.toISOString();
  if (updates.dueDate !== undefined)
    updateData.due_date = updates.dueDate?.toISOString();
  if (updates.returnedDate !== undefined)
    updateData.returned_date = updates.returnedDate?.toISOString();
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

  const { data, error } = await supabase
    .from("items")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // If borrowedBy changed, update friend counts
  if (
    updates.borrowedBy !== undefined &&
    updates.borrowedBy !== oldItem.borrowedBy
  ) {
    // Decrement count from old borrower if there was one
    if (oldItem.borrowedBy) {
      await decrementFriendBorrowCount(oldItem.borrowedBy);
    }
    // Increment count for new borrower if there is one
    if (updates.borrowedBy) {
      await incrementFriendBorrowCount(updates.borrowedBy);
    }
  }

  return convertItemFromDb(data);
}

export async function deleteItem(id: string): Promise<boolean> {
  const item = await getItemById(id);
  if (!item) return false;

  const { error } = await supabase.from("items").delete().eq("id", id);

  if (error) throw error;

  // Decrement friend's borrow count if item was borrowed
  if (item.borrowedBy) {
    await decrementFriendBorrowCount(item.borrowedBy);
  }

  return true;
}

export async function getItemsByFriend(friendId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("borrowed_by", friendId);

  if (error) throw error;
  return (data || []).map(convertItemFromDb);
}

export async function getActiveItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .not("borrowed_by", "is", null)
    .is("returned_date", null);

  if (error) throw error;
  return (data || []).map(convertItemFromDb);
}

export async function getAvailableItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .is("borrowed_by", null)
    .is("returned_date", null);

  if (error) throw error;
  return (data || []).map(convertItemFromDb);
}

export async function getOverdueItems(): Promise<Item[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .not("borrowed_by", "is", null)
    .is("returned_date", null)
    .not("due_date", "is", null)
    .lt("due_date", now);

  if (error) throw error;
  return (data || []).map(convertItemFromDb);
}

export async function markItemReturned(
  id: string,
  returnedDate?: Date
): Promise<Item | null> {
  return updateItem(id, {
    returnedDate: returnedDate || new Date(),
  });
}

export async function queryItems(filters?: ItemFilters): Promise<Item[]> {
  const userId = await getCurrentUserId();

  let query = supabase.from("items").select("*").eq("user_id", userId);

  // Filter by category
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  // Filter by friend
  if (filters?.friendId) {
    query = query.eq("borrowed_by", filters.friendId);
  }

  // Filter by status
  if (filters?.status) {
    const now = new Date().toISOString();
    if (filters.status === "available") {
      query = query.is("borrowed_by", null).is("returned_date", null);
    } else if (filters.status === "borrowed") {
      query = query
        .not("borrowed_by", "is", null)
        .is("returned_date", null)
        .or(`due_date.is.null,due_date.gte.${now}`);
    } else if (filters.status === "overdue") {
      query = query
        .not("borrowed_by", "is", null)
        .is("returned_date", null)
        .not("due_date", "is", null)
        .lt("due_date", now);
    }
  }

  // Filter by date range
  if (filters?.dateRange) {
    query = query
      .gte("borrowed_date", filters.dateRange.start.toISOString())
      .lte("borrowed_date", filters.dateRange.end.toISOString());
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) throw error;
  let items = (data || []).map(convertItemFromDb);

  // Client-side search (Supabase doesn't have great full-text search without extensions)
  if (filters?.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
    );
  }

  return items;
}

// ============================================================================
// Friends Service
// ============================================================================

export async function getAllFriends(): Promise<Friend[]> {
  const { data, error } = await supabase
    .from("friends")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []).map(convertFriendFromDb);
}

export async function getFriendById(id: string): Promise<Friend | null> {
  const { data, error } = await supabase
    .from("friends")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data ? convertFriendFromDb(data) : null;
}

export async function createFriend(
  friendData: Omit<
    Friend,
    | "id"
    | "totalItemsBorrowed"
    | "currentItemsBorrowed"
    | "createdAt"
    | "updatedAt"
  >
): Promise<Friend> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("friends")
    .insert([
      {
        user_id: userId,
        name: friendData.name,
        email: friendData.email,
        phone: friendData.phone,
        avatar_url: friendData.avatarUrl,
        total_items_borrowed: 0,
        current_items_borrowed: 0,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return convertFriendFromDb(data);
}

export async function updateFriend(
  id: string,
  updates: Partial<Friend>
): Promise<Friend | null> {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.avatarUrl !== undefined)
    updateData.avatar_url = updates.avatarUrl;
  if (updates.totalItemsBorrowed !== undefined)
    updateData.total_items_borrowed = updates.totalItemsBorrowed;
  if (updates.currentItemsBorrowed !== undefined)
    updateData.current_items_borrowed = updates.currentItemsBorrowed;

  const { data, error } = await supabase
    .from("friends")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data ? convertFriendFromDb(data) : null;
}

export async function deleteFriend(id: string): Promise<boolean> {
  const { error } = await supabase.from("friends").delete().eq("id", id);

  if (error) throw error;

  // Note: Items borrowed by this friend should be handled by the app
  // (either prevent deletion or clear the borrowedBy field)
  return true;
}

export async function queryFriends(filters?: FriendFilters): Promise<Friend[]> {
  let query = supabase.from("friends").select("*");

  // Filter by active loans
  if (filters?.hasActiveLoans) {
    query = query.gt("current_items_borrowed", 0);
  }

  const { data, error } = await query.order("name", { ascending: true });

  if (error) throw error;
  let friends = (data || []).map(convertFriendFromDb);

  // Client-side search
  if (filters?.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    friends = friends.filter(
      (friend) =>
        friend.name.toLowerCase().includes(query) ||
        friend.email?.toLowerCase().includes(query) ||
        friend.phone?.toLowerCase().includes(query)
    );
  }

  return friends;
}

async function incrementFriendBorrowCount(
  friendId: string | undefined
): Promise<void> {
  if (!friendId) return;

  const friend = await getFriendById(friendId);
  if (!friend) return;

  await updateFriend(friendId, {
    totalItemsBorrowed: friend.totalItemsBorrowed + 1,
    currentItemsBorrowed: friend.currentItemsBorrowed + 1,
  });
}

async function decrementFriendBorrowCount(
  friendId: string | undefined
): Promise<void> {
  if (!friendId) return;

  const friend = await getFriendById(friendId);
  if (!friend) return;

  await updateFriend(friendId, {
    currentItemsBorrowed: Math.max(0, friend.currentItemsBorrowed - 1),
  });
}

// ============================================================================
// History Service
// ============================================================================

export async function getAllHistory(): Promise<BorrowHistory[]> {
  const { data, error } = await supabase
    .from("borrow_history")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(convertHistoryFromDb);
}

export async function getHistoryByItem(
  itemId: string
): Promise<BorrowHistory[]> {
  const { data, error } = await supabase
    .from("borrow_history")
    .select("*")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(convertHistoryFromDb);
}

export async function getHistoryByFriend(
  friendId: string
): Promise<BorrowHistory[]> {
  const { data, error } = await supabase
    .from("borrow_history")
    .select("*")
    .eq("friend_id", friendId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(convertHistoryFromDb);
}

export async function addHistoryEntry(
  entry: Omit<BorrowHistory, "id" | "createdAt">
): Promise<BorrowHistory> {
  const { data, error } = await supabase
    .from("borrow_history")
    .insert([
      {
        item_id: entry.itemId,
        friend_id: entry.friendId,
        borrowed_date: entry.borrowedDate.toISOString(),
        returned_date: entry.returnedDate?.toISOString(),
        due_date: entry.dueDate?.toISOString(),
        notes: entry.notes,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return convertHistoryFromDb(data);
}

// ============================================================================
// Bulk Operations
// ============================================================================

export async function clearAllData(): Promise<void> {
  const userId = await getCurrentUserId();

  // Delete all user's data
  await Promise.all([
    supabase.from("items").delete().eq("user_id", userId),
    supabase.from("friends").delete().eq("user_id", userId),
    // History is tied to items, so it should cascade delete
  ]);
}

export async function exportData(): Promise<{
  items: Item[];
  friends: Friend[];
  history: BorrowHistory[];
}> {
  const [items, friends, history] = await Promise.all([
    getAllItems(),
    getAllFriends(),
    getAllHistory(),
  ]);

  return { items, friends, history };
}

export async function importData(data: {
  items?: Item[];
  friends?: Friend[];
  history?: BorrowHistory[];
}): Promise<void> {
  const userId = await getCurrentUserId();

  if (data.friends) {
    const friendsData = data.friends.map((friend) => ({
      id: friend.id,
      user_id: userId,
      name: friend.name,
      email: friend.email,
      phone: friend.phone,
      avatar_url: friend.avatarUrl,
      total_items_borrowed: friend.totalItemsBorrowed,
      current_items_borrowed: friend.currentItemsBorrowed,
      created_at: friend.createdAt.toISOString(),
      updated_at: friend.updatedAt.toISOString(),
    }));
    await supabase.from("friends").insert(friendsData);
  }

  if (data.items) {
    const itemsData = data.items.map((item) => ({
      id: item.id,
      user_id: userId,
      name: item.name,
      description: item.description,
      category: item.category,
      images: item.images,
      borrowed_by: item.borrowedBy,
      borrowed_date: item.borrowedDate?.toISOString(),
      due_date: item.dueDate?.toISOString(),
      returned_date: item.returnedDate?.toISOString(),
      notes: item.notes,
      metadata: item.metadata,
      created_at: item.createdAt.toISOString(),
      updated_at: item.updatedAt.toISOString(),
    }));
    await supabase.from("items").insert(itemsData);
  }

  if (data.history) {
    const historyData = data.history.map((entry) => ({
      id: entry.id,
      item_id: entry.itemId,
      friend_id: entry.friendId,
      borrowed_date: entry.borrowedDate.toISOString(),
      returned_date: entry.returnedDate?.toISOString(),
      due_date: entry.dueDate?.toISOString(),
      notes: entry.notes,
      created_at: entry.createdAt.toISOString(),
    }));
    await supabase.from("borrow_history").insert(historyData);
  }
}
