/**
 * Service for managing borrow requests
 *
 * Handles creating, querying, and updating borrow requests between users.
 */

import { supabase } from '../supabase';
import { addHistoryEntry } from './database';
import type { BorrowRequest, BorrowRequestWithDetails, BorrowRequestRow } from '../types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert database row to BorrowRequest with Date objects
 */
function convertBorrowRequestFromDb(row: any): BorrowRequest {
  return {
    id: row.id,
    itemId: row.item_id,
    requesterId: row.requester_id,
    ownerId: row.owner_id,
    status: row.status,
    requestedDueDate: row.requested_due_date ? new Date(row.requested_due_date) : undefined,
    message: row.message,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Convert database view row to BorrowRequestWithDetails
 */
function convertBorrowRequestWithDetailsFromDb(row: any): BorrowRequestWithDetails {
  return {
    id: row.id,
    itemId: row.item_id,
    requesterId: row.requester_id,
    ownerId: row.owner_id,
    status: row.status,
    requestedDueDate: row.requested_due_date ? new Date(row.requested_due_date) : undefined,
    message: row.message,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    itemName: row.item_name,
    itemCategory: row.item_category,
    itemImages: row.item_images,
    itemBorrowedBy: row.item_borrowed_by,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    requesterAvatarUrl: row.requester_avatar_url,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
  };
}

// ============================================================================
// Request Creation
// ============================================================================

/**
 * Create a new borrow request
 *
 * @param itemId - ID of the item to borrow
 * @param ownerId - ID of the item's owner
 * @param requestedDueDate - Optional requested return date
 * @param message - Optional message to the owner
 * @returns The created borrow request
 */
export async function createBorrowRequest(
  itemId: string,
  ownerId: string,
  requestedDueDate?: Date,
  message?: string
): Promise<BorrowRequest> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: friendship, error: friendshipError } = await supabase
    .from('user_friends')
    .select('connection_id')
    .eq('user_id', user.id)
    .eq('friend_user_id', ownerId)
    .maybeSingle();

  if (friendshipError) {
    throw new Error(`Failed to verify friendship: ${friendshipError.message}`);
  }

  if (!friendship) {
    throw new Error('You must be friends with this user to request their items');
  }

  // Check if item is available
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('id, borrowed_by, user_id')
    .eq('id', itemId)
    .single();

  if (itemError) {
    throw new Error(`Failed to fetch item: ${itemError.message}`);
  }

  if (item.user_id !== ownerId) {
    throw new Error('Owner ID does not match item owner');
  }

  // Check for existing pending or approved (queue) request from this user
  const { data: existingRequest } = await supabase
    .from('borrow_requests')
    .select('id')
    .eq('item_id', itemId)
    .eq('requester_id', user.id)
    .in('status', ['pending', 'approved'])
    .maybeSingle();

  if (existingRequest) {
    throw new Error('You already have an active request for this item');
  }

  // Create the request
  const { data, error } = await supabase
    .from('borrow_requests')
    .insert({
      item_id: itemId,
      requester_id: user.id,
      owner_id: ownerId,
      status: 'pending',
      requested_due_date: requestedDueDate?.toISOString(),
      message,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create borrow request: ${error.message}`);
  }

  return convertBorrowRequestFromDb(data);
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all borrow requests for items the current user owns (incoming)
 *
 * @returns Array of borrow requests with full details
 */
export async function getIncomingBorrowRequests(): Promise<BorrowRequestWithDetails[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('borrow_requests_with_details')
    .select('*')
    .eq('owner_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch incoming requests: ${error.message}`);
  }

  return (data || []).map(convertBorrowRequestWithDetailsFromDb);
}

/**
 * Get all borrow requests the current user has sent (outgoing)
 *
 * @returns Array of borrow requests with full details
 */
export async function getOutgoingBorrowRequests(): Promise<BorrowRequestWithDetails[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('borrow_requests_with_details')
    .select('*')
    .eq('requester_id', user.id)
    .in('status', ['pending', 'approved', 'denied'])
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch outgoing requests: ${error.message}`);
  }

  return (data || []).map(convertBorrowRequestWithDetailsFromDb);
}

/**
 * Get all borrow requests for a specific item
 *
 * @param itemId - ID of the item
 * @returns Array of borrow requests for the item
 */
export async function getBorrowRequestsForItem(itemId: string): Promise<BorrowRequestWithDetails[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('borrow_requests_with_details')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch requests for item: ${error.message}`);
  }

  return (data || []).map(convertBorrowRequestWithDetailsFromDb);
}

/**
 * Get the current user's active borrow request for a specific item
 * (pending or approved). Queries borrow_requests directly — avoids
 * any view-level RLS ambiguity.
 *
 * @param itemId - ID of the item
 * @returns The request, or null if none exists
 */
export async function getMyBorrowRequestForItem(itemId: string): Promise<BorrowRequest | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('borrow_requests')
    .select('*')
    .eq('item_id', itemId)
    .eq('requester_id', user.id)
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return convertBorrowRequestFromDb(data);
}

/**
 * Get count of pending incoming requests
 *
 * @returns Number of pending requests
 */
export async function getIncomingRequestCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from('borrow_requests')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .eq('status', 'pending');

  if (error) {
    return 0;
  }

  return count || 0;
}

// ============================================================================
// Request Actions
// ============================================================================

/**
 * Approve a borrow request and update the item
 *
 * @param requestId - ID of the request to approve
 * @param dueDate - Optional due date for the borrowed item
 * @returns The approved request
 */
export async function approveBorrowRequest(
  requestId: string,
  dueDate?: Date
): Promise<BorrowRequest> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get the request details
  const { data: request, error: requestError } = await supabase
    .from('borrow_requests')
    .select('*, items!inner(id, borrowed_by, borrowed_date, user_id)')
    .eq('id', requestId)
    .single();

  if (requestError) {
    throw new Error(`Failed to fetch request: ${requestError.message}`);
  }

  if (!request) {
    throw new Error('Request not found');
  }

  // Verify user is the owner
  if (request.owner_id !== user.id) {
    throw new Error('Only the item owner can approve requests');
  }

  // Verify request is pending
  if (request.status !== 'pending') {
    throw new Error('Only pending requests can be approved');
  }

  const itemCurrentlyBorrowed = !!(request.items.borrowed_by && request.items.borrowed_date);

  if (itemCurrentlyBorrowed) {
    // Item is already lent out — approve this as a queue position only.
    // Do NOT update the item or deny other pending requests.
    const { data: updatedRequest, error: updateError } = await supabase
      .from('borrow_requests')
      .update({ status: 'approved' })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to approve request: ${updateError.message}`);
    }

    return convertBorrowRequestFromDb(updatedRequest);
  }

  // Item is available — approve immediately and mark it as borrowed.
  const borrowedDate = new Date();
  const finalDueDate = dueDate || (request.requested_due_date ? new Date(request.requested_due_date) : undefined);

  const { data: updatedItem, error: itemError } = await supabase
    .from('items')
    .update({
      borrowed_by: request.requester_id,
      borrowed_date: borrowedDate.toISOString(),
      due_date: finalDueDate?.toISOString(),
      returned_date: null,
    })
    .eq('id', request.item_id)
    .is('borrowed_by', null)
    .select();

  if (itemError) {
    throw new Error(`Failed to update item: ${itemError.message}`);
  }

  if (!updatedItem || updatedItem.length === 0) {
    throw new Error('Item was already borrowed or could not be updated');
  }

  const { data: updatedRequest, error: updateError } = await supabase
    .from('borrow_requests')
    .update({ status: 'approved' })
    .eq('id', requestId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to approve request: ${updateError.message}`);
  }

  // Auto-deny other pending requests for the same item (item is now taken)
  await supabase
    .from('borrow_requests')
    .update({ status: 'denied' })
    .eq('item_id', request.item_id)
    .eq('status', 'pending')
    .neq('id', requestId);

  return convertBorrowRequestFromDb(updatedRequest);
}

/**
 * Deny a borrow request
 *
 * @param requestId - ID of the request to deny
 * @returns The denied request
 */
export async function denyBorrowRequest(requestId: string): Promise<BorrowRequest> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get the request to verify ownership
  const { data: request, error: fetchError } = await supabase
    .from('borrow_requests')
    .select('owner_id, status')
    .eq('id', requestId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch request: ${fetchError.message}`);
  }

  // Verify user is the owner
  if (request.owner_id !== user.id) {
    throw new Error('Only the item owner can deny requests');
  }

  // Verify request is pending
  if (request.status !== 'pending') {
    throw new Error('Only pending requests can be denied');
  }

  // Update the request status
  const { data, error } = await supabase
    .from('borrow_requests')
    .update({ status: 'denied' })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to deny request: ${error.message}`);
  }

  return convertBorrowRequestFromDb(data);
}

/**
 * Cancel a borrow request (requester only)
 *
 * @param requestId - ID of the request to cancel
 * @returns The cancelled request
 */
export async function cancelBorrowRequest(requestId: string): Promise<BorrowRequest> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get the request to verify ownership
  const { data: request, error: fetchError } = await supabase
    .from('borrow_requests')
    .select('requester_id, status')
    .eq('id', requestId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch request: ${fetchError.message}`);
  }

  // Verify user is the requester
  if (request.requester_id !== user.id) {
    throw new Error('Only the requester can cancel their request');
  }

  // Allow cancelling pending or approved (queue) requests
  if (request.status !== 'pending' && request.status !== 'approved') {
    throw new Error('Only pending or approved requests can be cancelled');
  }

  const { data, error } = await supabase
    .from('borrow_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to cancel request: ${error.message}`);
  }

  return convertBorrowRequestFromDb(data);
}

/**
 * Get approved queue entries for a borrowed item (people waiting to borrow next).
 * Excludes the current borrower. Ordered by approval time (first approved = first in queue).
 *
 * @param itemId - ID of the item
 * @param currentBorrowerId - ID of the person currently borrowing (excluded from results)
 */
export async function getApprovedQueueForItem(
  itemId: string,
  currentBorrowerId?: string
): Promise<BorrowRequestWithDetails[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from('borrow_requests_with_details')
    .select('*')
    .eq('item_id', itemId)
    .eq('status', 'approved')
    .order('updated_at', { ascending: true });

  if (currentBorrowerId) {
    query = query.neq('requester_id', currentBorrowerId);
  }

  const { data, error } = await query;

  if (error) return [];

  return (data || []).map(convertBorrowRequestWithDetailsFromDb);
}
