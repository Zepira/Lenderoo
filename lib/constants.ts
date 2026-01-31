/**
 * App-wide constants
 *
 * Centralized location for constant values used throughout the application
 */

import type { ItemCategory, ItemSortOption, FriendSortOption } from "./types";

// ============================================================================
// Item Categories
// ============================================================================

/**
 * Human-readable labels for item categories
 */
export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  book: "Books",
  tool: "Tools",
  clothing: "Clothing",
  electronics: "Electronics",
  game: "Games",
  sports: "Sports",
  kitchen: "Kitchen",
  other: "Other",
};

export const CATEGORY_ICONS: Record<ItemCategory, string> = {
  book: "Book",
  tool: "Wrench",
  clothing: "Shirt",
  electronics: "Laptop",
  game: "Gamepad2",
  sports: "Dumbbell",
  kitchen: "ChefHat",
  other: "Package",
};

export const CATEGORY_COLORS: Record<ItemCategory, string> = {
  book: "$blue9",
  tool: "$orange9",
  clothing: "$purple9",
  electronics: "$cyan9",
  game: "$pink9",
  sports: "$green9",
  kitchen: "$yellow9",
  other: "$gray9",
};

/**
 * Combined category configuration
 */
export const CATEGORY_CONFIG: Record<
  ItemCategory,
  { label: string; icon: string; color: string }
> = {
  book: {
    label: CATEGORY_LABELS.book,
    icon: CATEGORY_ICONS.book,
    color: CATEGORY_COLORS.book,
  },
  tool: {
    label: CATEGORY_LABELS.tool,
    icon: CATEGORY_ICONS.tool,
    color: CATEGORY_COLORS.tool,
  },
  clothing: {
    label: CATEGORY_LABELS.clothing,
    icon: CATEGORY_ICONS.clothing,
    color: CATEGORY_COLORS.clothing,
  },
  electronics: {
    label: CATEGORY_LABELS.electronics,
    icon: CATEGORY_ICONS.electronics,
    color: CATEGORY_COLORS.electronics,
  },
  game: {
    label: CATEGORY_LABELS.game,
    icon: CATEGORY_ICONS.game,
    color: CATEGORY_COLORS.game,
  },
  sports: {
    label: CATEGORY_LABELS.sports,
    icon: CATEGORY_ICONS.sports,
    color: CATEGORY_COLORS.sports,
  },
  kitchen: {
    label: CATEGORY_LABELS.kitchen,
    icon: CATEGORY_ICONS.kitchen,
    color: CATEGORY_COLORS.kitchen,
  },
  other: {
    label: CATEGORY_LABELS.other,
    icon: CATEGORY_ICONS.other,
    color: CATEGORY_COLORS.other,
  },
};

// Re-export types for convenience
export type { ItemCategory };

// ============================================================================
// Item Status
// ============================================================================

/**
 * Colors for item status
 */
export const STATUS_COLORS = {
  borrowed: "$blue9",
  returned: "$green9",
  overdue: "$red9",
} as const;

/**
 * Human-readable labels for item status
 */
export const STATUS_LABELS = {
  borrowed: "Borrowed",
  returned: "Returned",
  overdue: "Overdue",
  available: "Available",
} as const;

/**
 * Icons for item status
 */
export const STATUS_ICONS = {
  borrowed: "Clock",
  returned: "CheckCircle",
  overdue: "AlertCircle",
} as const;

// ============================================================================
// Sort Options
// ============================================================================

/**
 * Human-readable labels for item sort options
 */
export const ITEM_SORT_LABELS: Record<ItemSortOption, string> = {
  dateNewest: "Newest First",
  dateOldest: "Oldest First",
  nameAsc: "Name (A-Z)",
  nameDesc: "Name (Z-A)",
  dueDateSoonest: "Due Date (Soonest)",
  dueDateLatest: "Due Date (Latest)",
};

/**
 * Human-readable labels for friend sort options
 */
export const FRIEND_SORT_LABELS: Record<FriendSortOption, string> = {
  nameAsc: "Name (A-Z)",
  nameDesc: "Name (Z-A)",
  mostItems: "Most Items",
  leastItems: "Least Items",
};

// ============================================================================
// Date & Time
// ============================================================================

/**
 * Number of days before due date to show warning
 */
export const DUE_SOON_THRESHOLD_DAYS = 3;

/**
 * Default number of days to add for due date when creating item
 */
export const DEFAULT_DUE_DATE_DAYS = 14;

/**
 * Date format for display (e.g., "Jan 15, 2024")
 */
export const DATE_FORMAT = "MMM dd, yyyy";

/**
 * Date format with time (e.g., "Jan 15, 2024 at 3:30 PM")
 */
export const DATE_TIME_FORMAT = "MMM dd, yyyy 'at' h:mm a";

/**
 * Relative time thresholds
 */
export const RELATIVE_TIME = {
  JUST_NOW_SECONDS: 60,
  MINUTES_THRESHOLD: 3600, // 1 hour
  HOURS_THRESHOLD: 86400, // 1 day
  DAYS_THRESHOLD: 604800, // 1 week
} as const;

// ============================================================================
// Notifications
// ============================================================================

/**
 * Default reminder days before due date
 */
export const DEFAULT_REMINDER_DAYS = 3;

/**
 * Notification identifiers for cancellation
 */
export const NOTIFICATION_IDS = {
  DUE_SOON: "item-due-soon",
  OVERDUE: "item-overdue",
  DAILY_OVERDUE_CHECK: "daily-overdue-check",
} as const;

/**
 * Notification channel IDs (Android)
 */
export const NOTIFICATION_CHANNELS = {
  REMINDERS: "reminders",
  OVERDUE: "overdue",
  GENERAL: "general",
} as const;

// ============================================================================
// UI Constants
// ============================================================================

/**
 * Default empty state messages
 */
export const EMPTY_STATES = {
  NO_ITEMS: {
    title: "No items yet",
    message: "Start tracking items you've lent to friends",
    actionLabel: "Add Your First Item",
  },
  NO_FRIENDS: {
    title: "No friends yet",
    message: "Add friends to start lending them items",
    actionLabel: "Add Your First Friend",
  },
  NO_SEARCH_RESULTS: {
    title: "No results found",
    message: "Try adjusting your search or filters",
  },
  NO_HISTORY: {
    title: "No history yet",
    message: "Borrowing history will appear here",
  },
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/**
 * Image upload constraints
 */
export const IMAGE_UPLOAD = {
  MAX_SIZE_MB: 5,
  MAX_SIZE_BYTES: 5 * 1024 * 1024,
  ALLOWED_TYPES: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  MAX_WIDTH: 1920,
  MAX_HEIGHT: 1920,
  QUALITY: 0.8,
  MAX_IMAGES_PER_ITEM: 5,
} as const;

/**
 * Form validation constraints
 */
export const VALIDATION = {
  ITEM_NAME_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 1000,
  NOTES_MAX_LENGTH: 1000,
  FRIEND_NAME_MAX_LENGTH: 100,
} as const;

/**
 * Animation durations (ms)
 */
export const ANIMATION = {
  FAST: 150,
  NORMAL: 250,
  SLOW: 350,
} as const;

/**
 * Debounce delays (ms)
 */
export const DEBOUNCE = {
  SEARCH: 300,
  AUTO_SAVE: 1000,
} as const;

// ============================================================================
// Storage Keys
// ============================================================================

/**
 * AsyncStorage keys for local data
 */
export const STORAGE_KEYS = {
  ITEMS: "@lenderoo:items",
  FRIENDS: "@lenderoo:friends",
  HISTORY: "@lenderoo:history",
  SETTINGS: "@lenderoo:settings",
  USER: "@lenderoo:user",
  AUTH_TOKEN: "@lenderoo:auth_token",
  ONBOARDING_COMPLETED: "@lenderoo:onboarding_completed",
  LAST_SYNC: "@lenderoo:last_sync",
  MIGRATION_COMPLETE: "@lenderoo:migration_complete",
} as const;

// ============================================================================
// App Info
// ============================================================================

/**
 * App metadata
 */
export const APP_INFO = {
  NAME: "Lenderoo",
  TAGLINE: "Never forget who borrowed your stuff",
  SUPPORT_EMAIL: "support@lenderoo.app",
  PRIVACY_POLICY_URL: "https://lenderoo.app/privacy",
  TERMS_OF_SERVICE_URL: "https://lenderoo.app/terms",
  GITHUB_URL: "https://github.com/yourusername/lenderoo",
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Feature flags for gradual rollout
 */
export const FEATURES = {
  ENABLE_WEB_VERSION: true,
  ENABLE_SOCIAL_SHARING: false,
  ENABLE_ITEM_VALUE_TRACKING: true,
  ENABLE_MULTIPLE_IMAGES: true,
  ENABLE_BARCODE_SCANNING: false,
  ENABLE_CLOUD_SYNC: true, // Enabled with Supabase backend
  ENABLE_PUSH_NOTIFICATIONS: false, // Enable when configured
} as const;

// ============================================================================
// Error Messages
// ============================================================================

/**
 * Common error messages
 */
export const ERROR_MESSAGES = {
  GENERIC: "Something went wrong. Please try again.",
  NETWORK: "Network error. Please check your connection.",
  NOT_FOUND: "Item not found.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  VALIDATION: "Please check your input and try again.",
  IMAGE_UPLOAD: "Failed to upload image. Please try again.",
  IMAGE_TOO_LARGE: `Image must be smaller than ${IMAGE_UPLOAD.MAX_SIZE_MB}MB`,
  INVALID_DATE: "Invalid date provided.",
  ITEM_ALREADY_RETURNED: "This item has already been returned.",
  FRIEND_HAS_ACTIVE_ITEMS: "This friend still has borrowed items.",
} as const;

// ============================================================================
// Success Messages
// ============================================================================

/**
 * Common success messages
 */
export const SUCCESS_MESSAGES = {
  ITEM_CREATED: "Item added successfully",
  ITEM_UPDATED: "Item updated successfully",
  ITEM_DELETED: "Item deleted successfully",
  ITEM_RETURNED: "Item marked as returned",
  FRIEND_CREATED: "Friend added successfully",
  FRIEND_UPDATED: "Friend updated successfully",
  FRIEND_DELETED: "Friend deleted successfully",
  SETTINGS_SAVED: "Settings saved successfully",
  IMAGE_UPLOADED: "Image uploaded successfully",
} as const;
