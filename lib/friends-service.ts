/**
 * Friends Service
 *
 * Handles user-to-user friend connections, friend codes, and friend search
 */

import { supabase } from "./supabase";

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
  status: 'pending' | 'active' | 'rejected';
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

  // Check if friendship already exists
  const { data: existing } = await supabase
    .from("friend_connections")
    .select("id, status")
    .or(
      `and(user_id.eq.${user.id},friend_user_id.eq.${friendData.id}),and(user_id.eq.${friendData.id},friend_user_id.eq.${user.id})`
    )
    .maybeSingle();

  if (existing) {
    if (existing.status === 'pending') {
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

  // Check if friendship already exists
  const { data: existing } = await supabase
    .from("friend_connections")
    .select("id, status")
    .or(
      `and(user_id.eq.${user.id},friend_user_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_user_id.eq.${user.id})`
    )
    .maybeSingle();

  if (existing) {
    if (existing.status === 'pending') {
      throw new Error("Friend request already sent");
    }
    throw new Error("Already friends with this user");
  }

  // Create friend request (pending status)
  const { error } = await supabase
    .from("friend_connections")
    .insert({
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
 * Get a single friend's details by their user ID
 */
export async function getFriendUserById(friendUserId: string): Promise<FriendUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // First verify they are friends
  const { data: connection } = await supabase
    .from("friend_connections")
    .select("id")
    .or(
      `and(user_id.eq.${user.id},friend_user_id.eq.${friendUserId},status.eq.active),and(user_id.eq.${friendUserId},friend_user_id.eq.${user.id},status.eq.active)`
    )
    .maybeSingle();

  if (!connection) {
    return null; // Not friends
  }

  // Get the friend's user details
  const { data: friendData, error } = await supabase
    .from("users")
    .select("id, name, email, avatar_url, friend_code")
    .eq("id", friendUserId)
    .single();

  if (error || !friendData) return null;

  // Get the friendship date
  const { data: friendshipData } = await supabase
    .from("friend_connections")
    .select("created_at")
    .eq("user_id", user.id)
    .eq("friend_user_id", friendUserId)
    .eq("status", "active")
    .maybeSingle();

  return {
    id: friendData.id,
    name: friendData.name,
    email: friendData.email,
    avatarUrl: friendData.avatar_url || undefined,
    friendCode: friendData.friend_code,
    friendsSince: friendshipData ? new Date(friendshipData.created_at) : new Date(),
  };
}

/**
 * Get items borrowed by a friend user
 */
export async function getItemsBorrowedByFriend(friendUserId: string): Promise<any[]> {
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

  console.log("🔍 Fetching friend requests for user:", user.id);

  // First get the friend connections
  const { data: connections, error: connectionsError } = await supabase
    .from("friend_connections")
    .select("id, user_id, friend_user_id, status, created_at")
    .eq("friend_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (connectionsError) {
    console.error("❌ Error fetching connections:", connectionsError);
    throw connectionsError;
  }

  console.log("📦 Found connections:", connections);

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
    console.error("❌ Error fetching user details:", usersError);
    throw usersError;
  }

  console.log("👥 Found requesters:", requesters);

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

  console.log("✅ Mapped friend requests:", requestsWithUsers);

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
