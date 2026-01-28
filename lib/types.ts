/**
 * Core type definitions for Lenderoo
 *
 * This file contains all TypeScript interfaces and types used throughout the app
 * for tracking items lent to friends.
 */

// ============================================================================
// Enums and Literal Types
// ============================================================================

/**
 * Item categories for organization and filtering
 */
export type ItemCategory =
  | "book"
  | "tool"
  | "clothing"
  | "electronics"
  | "game"
  | "sports"
  | "kitchen"
  | "other";

/**
 * Status of a borrowed item
 */
export type ItemStatus = "borrowed" | "overdue" | "requested" | "available";

/**
 * Sort options for item lists
 */
export type ItemSortOption =
  | "dateNewest"
  | "dateOldest"
  | "nameAsc"
  | "nameDesc"
  | "dueDateSoonest"
  | "dueDateLatest";

/**
 * Sort options for friend lists
 */
export type FriendSortOption =
  | "nameAsc"
  | "nameDesc"
  | "mostItems"
  | "leastItems";

// ============================================================================
// Core Data Models
// ============================================================================

/**
 * User account information
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string;
  /** URL to user's avatar image */
  avatarUrl?: string;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Friend/contact who borrows items
 */
export interface Friend {
  /** Unique friend identifier */
  id: string;
  /** ID of the user who owns this friend record */
  userId: string;
  /** Friend's name */
  name: string;
  /** Friend's email address (optional) */
  email?: string;

  /** URL to friend's avatar image */
  avatarUrl?: string;
  /** Total number of items this friend has ever borrowed */
  totalItemsBorrowed: number;
  /** Current number of items this friend has borrowed and not returned */
  currentItemsBorrowed: number;
  /** Friend record creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Item that has been lent to a friend
 */
export interface Item {
  /** Unique item identifier */
  id: string;
  /** ID of the user who owns this item */
  userId: string;
  /** Item name/title */
  name: string;
  /** Detailed description of the item */
  description?: string;
  /** Category for organization */
  category: ItemCategory;
  /** URL to item's photo */
  imageUrl?: string;
  /** Array of image URLs for multiple photos */
  imageUrls?: string[];
  /** ID of the friend who borrowed this item (null if available) */
  borrowedBy?: string;
  /** Date when item was borrowed (null if never borrowed) */
  borrowedDate?: Date;
  /** Optional due date for return */
  dueDate?: Date;
  /** Date when item was returned (null if still borrowed) */
  returnedDate?: Date;
  /** Additional notes about the item or borrowing */
  notes?: string;
  /** Estimated value of the item (optional) */
  value?: number;
  /** Category-specific metadata (author, ISBN, etc.) */
  metadata?: ItemMetadata;
  /** Item record creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Category-specific metadata for items
 */
export type ItemMetadata =
  | BookMetadata
  | ToolMetadata
  | Record<string, unknown>;

/**
 * Metadata specific to books
 */
export interface BookMetadata {
  /** Book author(s) */
  author?: string;
  /** Series name if part of a series */
  seriesName?: string;
  /** Position in series (e.g., "Book 3") */
  seriesNumber?: string | number;
  /** Book genre(s) */
  seriesId?: number;
  genre?: string | string[];
  /** Book synopsis/description */
  synopsis?: string;
  /** ISBN-10 or ISBN-13 */
  isbn?: string;
  /** Publisher name */
  publisher?: string;
  /** Publication year */
  publicationYear?: number;
  /** Number of pages */
  pageCount?: number;
  /** Average rating (e.g., 4.5 out of 5) */
  averageRating?: number;
  /** Hardcover book ID */
  hardcoverId?: string;
}

/**
 * Metadata specific to tools
 */
export interface ToolMetadata {
  /** Tool brand/manufacturer */
  brand?: string;
  /** Model number */
  modelNumber?: string;
  /** Purchase date */
  purchaseDate?: Date | string;
  /** Warranty expiration */
  warrantyExpiration?: Date | string;
  /** Serial number */
  serialNumber?: string;
}

/**
 * Historical record of item borrowing
 * Tracks the complete history of an item being lent out
 */
export interface BorrowHistory {
  /** Unique history entry identifier */
  id: string;
  /** ID of the item that was borrowed */
  itemId: string;
  /** ID of the friend who borrowed the item */
  friendId: string;
  /** Date when item was borrowed */
  borrowedDate: Date;
  /** Optional due date for return */
  dueDate?: Date;
  /** Date when item was returned (null if still borrowed) */
  returnedDate?: Date;
  /** Notes about this borrowing instance */
  notes?: string;
  /** History entry creation timestamp */
  createdAt: Date;
}

// ============================================================================
// Extended/Computed Types
// ============================================================================

/**
 * Item with computed status and friend information
 * Used for display in lists and detail views
 */
export interface ItemWithDetails extends Item {
  /** Computed status based on dates */
  status: ItemStatus;
  /** Friend information for the borrower */
  friend: Friend;
  /** Number of days until due (negative if overdue) */
  daysUntilDue?: number;
  /** Number of days borrowed */
  daysBorrowed: number;
}

/**
 * Friend with current items they've borrowed
 * Used for friend detail views
 */
export interface FriendWithItems extends Friend {
  /** Array of items currently borrowed by this friend */
  currentItems: Item[];
  /** Complete borrow history for this friend */
  borrowHistory: BorrowHistory[];
}

/**
 * Statistics for a friend
 */
export interface FriendStats {
  /** Friend ID */
  friendId: string;
  /** Total items ever borrowed */
  totalItemsBorrowed: number;
  /** Current items borrowed (not returned) */
  currentItemsBorrowed: number;
  /** Average number of days items are kept */
  averageBorrowDuration: number;
  /** Number of overdue items currently held */
  overdueItemsCount: number;
  /** Most borrowed item category */
  favoriteCategory?: ItemCategory;
}

/**
 * Overall app statistics
 */
export interface AppStats {
  /** Total number of items in the system */
  totalItems: number;
  /** Number of items currently borrowed */
  itemsCurrentlyBorrowed: number;
  /** Number of items returned */
  itemsReturned: number;
  /** Number of overdue items */
  overdueItems: number;
  /** Total number of friends */
  totalFriends: number;
  /** Most borrowed item category */
  mostBorrowedCategory?: ItemCategory;
  /** Friend who has borrowed the most items */
  topBorrower?: {
    friendId: string;
    friendName: string;
    count: number;
  };
}

// ============================================================================
// Form Input Types
// ============================================================================

/**
 * Input data for creating a new item
 */
export interface CreateItemInput {
  name: string;
  description?: string;
  category: ItemCategory;
  imageUrl?: string;
  imageUrls?: string[];
  borrowedBy?: string;
  borrowedDate?: Date;
  dueDate?: Date;
  notes?: string;
  value?: number;
}

/**
 * Input data for updating an existing item
 */
export interface UpdateItemInput {
  name?: string;
  description?: string;
  category?: ItemCategory;
  imageUrl?: string;
  imageUrls?: string[];
  borrowedBy?: string;
  borrowedDate?: Date;
  dueDate?: Date;
  returnedDate?: Date;
  notes?: string;
  value?: number;
}

/**
 * Input data for creating a new friend
 */
export interface CreateFriendInput {
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

/**
 * Input data for updating an existing friend
 */
export interface UpdateFriendInput {
  name?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

/**
 * Input for marking an item as returned
 */
export interface ReturnItemInput {
  itemId: string;
  returnedDate?: Date;
  notes?: string;
}

// ============================================================================
// Filter and Query Types
// ============================================================================

/**
 * Filters for querying items
 */
export interface ItemFilters {
  /** Filter by category */
  category?: ItemCategory;
  /** Filter by friend ID */
  friendId?: string;
  /** Filter by status */
  status?: ItemStatus;
  /** Search query for name/description */
  searchQuery?: string;
  /** Filter by date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Filters for querying friends
 */
export interface FriendFilters {
  /** Search query for name/email */
  searchQuery?: string;
  /** Only friends with currently borrowed items */
  hasActiveLoans?: boolean;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  /** Number of items per page */
  limit: number;
  /** Page offset */
  offset: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  /** Array of items for this page */
  data: T[];
  /** Total count of items (all pages) */
  total: number;
  /** Current page number */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Whether there are more pages */
  hasMore: boolean;
}

// ============================================================================
// Notification Types
// ============================================================================

/**
 * Notification types for reminders
 */
export type NotificationType = "dueSoon" | "overdue" | "returned" | "reminder";

/**
 * Notification data
 */
export interface Notification {
  /** Unique notification identifier */
  id: string;
  /** Type of notification */
  type: NotificationType;
  /** Notification title */
  title: string;
  /** Notification body message */
  body: string;
  /** Related item ID */
  itemId?: string;
  /** Related friend ID */
  friendId?: string;
  /** Scheduled time for notification */
  scheduledFor: Date;
  /** Whether notification has been sent */
  sent: boolean;
  /** When notification was created */
  createdAt: Date;
}

// ============================================================================
// Settings and Preferences
// ============================================================================

/**
 * User preferences and app settings
 */
export interface UserSettings {
  /** User ID these settings belong to */
  userId: string;
  /** Theme preference */
  theme: "light" | "dark" | "system";
  /** Enable push notifications */
  notificationsEnabled: boolean;
  /** Days before due date to send reminder */
  reminderDaysBefore: number;
  /** Enable overdue notifications */
  overdueNotificationsEnabled: boolean;
  /** Default item category */
  defaultCategory?: ItemCategory;
  /** Whether to require due dates for new items */
  requireDueDate: boolean;
  /** Default view for items list */
  defaultItemView: "list" | "grid";
  /** Default sort for items */
  defaultItemSort: ItemSortOption;
  /** Default sort for friends */
  defaultFriendSort: FriendSortOption;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * API Error response
 */
export interface ApiError {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Validation error for form fields
 */
export interface ValidationError {
  /** Field name that failed validation */
  field: string;
  /** Validation error message */
  message: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API success response
 */
export interface ApiResponse<T> {
  /** Response data */
  data: T;
  /** Success message */
  message?: string;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  /** Error information */
  error: ApiError;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Async operation state for UI
 */
export interface AsyncState<T> {
  /** The data */
  data: T | null;
  /** Loading state */
  loading: boolean;
  /** Error if any */
  error: ApiError | null;
}

/**
 * Represents a database timestamp (for Supabase compatibility)
 */
export type Timestamp = string | Date;

/**
 * Utility type to convert Date fields to Timestamp (for DB storage)
 */
export type WithTimestamps<T> = {
  [K in keyof T]: T[K] extends Date ? Timestamp : T[K];
};

/**
 * Database row types (with string timestamps instead of Date objects)
 */
export type ItemRow = WithTimestamps<Item>;
export type FriendRow = WithTimestamps<Friend>;
export type BorrowHistoryRow = WithTimestamps<BorrowHistory>;
export type UserRow = WithTimestamps<User>;
