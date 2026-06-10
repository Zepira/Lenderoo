/**
 * Friends Service
 *
 * Handles user-to-user friend connections, friend codes, and friend search
 */

import { supabase } from "../supabase";

export interface FriendUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  friendCode: string;
  friendsSince: Date;
}

export interface FriendRequest {
  id: string;
  userId: string;
  friendUserId: string;
  status: "pending" | "active" | "rejected";
  createdAt: Date;
  userName: string;
  userEmail: string;
  userAvatarUrl?: string;
  userFriendCode: string;
}

export interface AddFriendResult {
  success: boolean;
  friendUserId?: string;
  message: string;
}

// ============================================================================
// Friend Code Management
// ============================================================================

/**
 * Get current user's friend code
 */
export async function getMyFriendCode(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("users")
    .select("friend_code")
    .eq("id", user.id)
    .single();

  if (error) throw error;

  return data?.friend_code || null;
}

/**
 * Regenerate user's friend code
 */
export async function regenerateFriendCode(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Call the stored function to get a new unique code
  const { data: newCodeData, error: codeError } = await supabase.rpc(
    "get_unique_friend_code"
  );

  if (codeError) throw codeError;

  const newCode = newCodeData as string;

  // Update user's friend code
  const { error } = await supabase
    .from("users")
    .update({ friend_code: newCode })
    .eq("id", user.id);

  if (error) throw error;

  return newCode;
}

// ============================================================================
// Add Friends
// ============================================================================

/**
 * Send a friend request using their friend code
 */
export async function addFriendByCode(
  friendCode: string
): Promise<AddFriendResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Find user with friend code
  const { data: friendData, error: findError } = await supabase
    .from("users")
    .select("id")
    .eq("friend_code", friendCode.toUpperCase().trim())
    .single();

  if (findError || !friendData) {
    return {
      success: false,
      message: "Invalid friend code",
    };
  }

  // Check if trying to add self
  if (friendData.id === user.id) {
    return {
      success: false,
      message: "Cannot add yourself as a friend",
    };
  }

  // Check if friendship already exists (may return 2 rows for bidirectional friendship)
  const { data: existing } = await supabase
    .from("friend_connections")
    .select("id, status")
    .or(
      `and(user_id.eq.${user.id},friend_user_id.eq.${friendData.id}),and(user_id.eq.${friendData.id},friend_user_id.eq.${user.id})`
    )
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (existing.status === "pending") {
      return {
        success: false,
        message: "Friend request already sent",
      };
    }
    return {
      success: false,
      message: "Already friends",
    };
  }

  // Create friend request (pending status)
  const { error: insertError } = await supabase
    .from("friend_connections")
    .insert({
      user_id: user.id,
      friend_user_id: friendData.id,
      status: "pending",
    });

  if (insertError) throw insertError;

  return {
    success: true,
    friendUserId: friendData.id,
    message: "Friend request sent!",
  };
}

/**
 * Search for users by name or email
 */
export async function searchUsers(query: string): Promise<FriendUser[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const searchTerm = `%${query.trim()}%`;

  // Search users by name or email
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, avatar_url, friend_code")
    .neq("id", user.id) // Exclude current user
    .or(`name.ilike.${searchTerm},email.ilike.${searchTerm}`)
    .limit(20);

  if (error) throw error;

  // Get existing friend connections to filter out
  const { data: connections } = await supabase
    .from("friend_connections")
    .select("friend_user_id")
    .eq("user_id", user.id);

  const friendIds = new Set(connections?.map((c) => c.friend_user_id) || []);

  // Filter out users who are already friends
  const availableUsers = (data || [])
    .filter((u) => !friendIds.has(u.id))
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatar_url || undefined,
      friendCode: u.friend_code,
      friendsSince: new Date(), // Not applicable for search results
    }));

  return availableUsers;
}

/**
 * Send a friend request by their user ID (after searching)
 */
export async function addFriendByUserId(friendUserId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Check if friendship already exists (may return 2 rows for bidirectional friendship)
  const { data: existing } = await supabase
    .from("friend_connections")
    .select("id, status")
    .or(
      `and(user_id.eq.${user.id},friend_user_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_user_id.eq.${user.id})`
    )
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (existing.status === "pending") {
      throw new Error("Friend request already sent");
    }
    throw new Error("Already friends with this user");
  }

  // Create friend request (pending status)
  const { error } = await supabase.from("friend_connections").insert({
    user_id: user.id,
    friend_user_id: friendUserId,
    status: "pending",
  });

  if (error) throw error;
}

// ============================================================================
// Get Friends
// ============================================================================

/**
 * Get all friends for current user
 */
export async function getMyFriends(): Promise<FriendUser[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("user_friends")
    .select("*")
    .eq("user_id", user.id)
    .order("friend_name");

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.friend_user_id,
    name: row.friend_name,
    email: row.friend_email,
    avatarUrl: row.friend_avatar_url || undefined,
    friendCode: row.friend_code,
    friendsSince: new Date(row.friends_since),
  }));
}

/**
 * Get a single friend's details by their user ID.
 * Returns null (silently) if no active friendship exists.
 */
export async function getFriendUserById(
  friendUserId: string
): Promise<FriendUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: connection, error: connectionError } = await supabase
    .from("user_friends")
    .select("friends_since, friend_name, friend_email, friend_avatar_url, friend_code")
    .eq("user_id", user.id)
    .eq("friend_user_id", friendUserId)
    .maybeSingle();

  if (connectionError || !connection) return null;

  return {
    id: friendUserId,
    name: connection.friend_name,
    email: connection.friend_email,
    avatarUrl: connection.friend_avatar_url || undefined,
    friendCode: connection.friend_code,
    friendsSince: connection.friends_since
      ? new Date(connection.friends_since)
      : new Date(),
  };
}

export interface UserPublicProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

/**
 * Get basic public profile for any user by ID.
 * Does not require friendship — uses the open users read policy.
 */
export async function getUserPublicProfile(
  userId: string
): Promise<UserPublicProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    avatarUrl: data.avatar_url || undefined,
  };
}

/**
 * Get items borrowed by a friend user
 */
export async function getItemsBorrowedByFriend(
  friendUserId: string
): Promise<any[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", user.id) // My items
    .eq("borrowed_by", friendUserId) // Borrowed by this friend
    .order("borrowed_date", { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Get items owned by a friend user
 * Note: This function assumes friendship has already been verified (e.g., on friend detail page)
 */
export async function getItemsOwnedByFriend(
  friendUserId: string
): Promise<any[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", friendUserId) // Their items
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Get item counts for a friend (items they own and items they're borrowing from you)
 */
export async function getFriendItemCounts(friendUserId: string): Promise<{
  ownedCount: number;
  borrowedCount: number;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Count items they own - fetch data instead of using head: true to bypass potential RLS issues
  const { data: ownedData, error: ownedError } = await supabase
    .from("items")
    .select("id")
    .eq("user_id", friendUserId);

  // Count items they're currently borrowing from you
  const { data: borrowedData, error: borrowedError } = await supabase
    .from("items")
    .select("id")
    .eq("user_id", user.id) // My items
    .eq("borrowed_by", friendUserId) // Borrowed by this friend
    .is("returned_date", null); // Not yet returned

  const ownedCount = ownedData?.length || 0;
  const borrowedCount = borrowedData?.length || 0;

  return {
    ownedCount,
    borrowedCount,
  };
}

/**
 * Remove a friend connection
 */
export async function removeFriend(friendUserId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Delete both sides of the friendship
  const { error } = await supabase
    .from("friend_connections")
    .delete()
    .or(
      `and(user_id.eq.${user.id},friend_user_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_user_id.eq.${user.id})`
    );

  if (error) throw error;
}

// ============================================================================
// Friend Requests
// ============================================================================

/**
 * Get incoming friend requests (requests sent to me)
 */
export async function getPendingFriendRequests(): Promise<FriendRequest[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // First get the friend connections
  const { data: connections, error: connectionsError } = await supabase
    .from("friend_connections")
    .select("id, user_id, friend_user_id, status, created_at")
    .eq("friend_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (connectionsError) {
    throw connectionsError;
  }

  if (!connections || connections.length === 0) {
    return [];
  }

  // Get user details for each requester
  const requesterIds = connections.map((c) => c.user_id);
  const { data: requesters, error: usersError } = await supabase
    .from("users")
    .select("id, name, email, avatar_url, friend_code")
    .in("id", requesterIds);

  if (usersError) {
    throw usersError;
  }

  // Map connections with user details
  const requestsWithUsers = connections.map((conn) => {
    const requester = requesters?.find((r) => r.id === conn.user_id);
    return {
      id: conn.id,
      userId: conn.user_id,
      friendUserId: conn.friend_user_id,
      status: conn.status as "pending",
      createdAt: new Date(conn.created_at),
      userName: requester?.name || "Unknown",
      userEmail: requester?.email || "",
      userAvatarUrl: requester?.avatar_url || undefined,
      userFriendCode: requester?.friend_code || "",
    };
  });

  return requestsWithUsers;
}

/**
 * Approve a friend request
 */
export async function approveFriendRequest(requestId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Get the request details
  const { data: request, error: fetchError } = await supabase
    .from("friend_connections")
    .select("user_id, friend_user_id")
    .eq("id", requestId)
    .eq("friend_user_id", user.id)
    .eq("status", "pending")
    .single();

  if (fetchError || !request) {
    throw new Error("Friend request not found");
  }

  // Update the request to active
  const { error: updateError } = await supabase
    .from("friend_connections")
    .update({ status: "active" })
    .eq("id", requestId);

  if (updateError) throw updateError;

  // Create the reciprocal connection
  const { error: insertError } = await supabase
    .from("friend_connections")
    .insert({
      user_id: user.id,
      friend_user_id: request.user_id,
      status: "active",
    });

  if (insertError) throw insertError;
}

/**
 * Deny/reject a friend request
 */
export async function denyFriendRequest(requestId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Delete the request
  const { error } = await supabase
    .from("friend_connections")
    .delete()
    .eq("id", requestId)
    .eq("friend_user_id", user.id)
    .eq("status", "pending");

  if (error) throw error;
}
