import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Item, Friend, ItemStatus, ItemWithDetails } from "./types";
import { DUE_SOON_THRESHOLD_DAYS } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate the number of days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / oneDay);
}

/**
 * Calculate days until a due date (negative if overdue)
 */
export function daysUntilDue(dueDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (24 * 60 * 60 * 1000));
}

/**
 * Calculate days since borrowed
 */
export function daysBorrowed(borrowedDate: Date, returnedDate?: Date): number {
  const endDate = returnedDate || new Date();
  return daysBetween(borrowedDate, endDate);
}

/**
 * Check if a date is overdue
 */
export function isOverdue(dueDate: Date | undefined): boolean {
  if (!dueDate) return false;
  return daysUntilDue(dueDate) < 0;
}

/**
 * Check if a date is due soon
 */
export function isDueSoon(dueDate: Date | undefined): boolean {
  if (!dueDate) return false;
  const days = daysUntilDue(dueDate);
  return days >= 0 && days <= DUE_SOON_THRESHOLD_DAYS;
}

/**
 * Format date to relative time (e.g., "2 days ago", "in 3 days")
 */
export function formatRelativeTime(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "";
  }
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.floor(Math.abs(diffMs) / 1000);
  const isPast = diffMs < 0;

  if (diffSec < 60) {
    return "just now";
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return isPast
      ? `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`
      : `in ${diffMin} minute${diffMin > 1 ? "s" : ""}`;
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return isPast
      ? `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`
      : `in ${diffHour} hour${diffHour > 1 ? "s" : ""}`;
  }

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) {
    return isPast
      ? `${diffDay} day${diffDay > 1 ? "s" : ""} ago`
      : `in ${diffDay} day${diffDay > 1 ? "s" : ""}`;
  }

  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) {
    return isPast
      ? `${diffWeek} week${diffWeek > 1 ? "s" : ""} ago`
      : `in ${diffWeek} week${diffWeek > 1 ? "s" : ""}`;
  }

  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) {
    return isPast
      ? `${diffMonth} month${diffMonth > 1 ? "s" : ""} ago`
      : `in ${diffMonth} month${diffMonth > 1 ? "s" : ""}`;
  }

  const diffYear = Math.floor(diffDay / 365);
  return isPast
    ? `${diffYear} year${diffYear > 1 ? "s" : ""} ago`
    : `in ${diffYear} year${diffYear > 1 ? "s" : ""}`;
}

/**
 * Format date to short string (e.g., "Jan 15, 2024")
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Format date with time (e.g., "Jan 15, 2024 at 3:30 PM")
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ============================================================================
// Item Status Utilities
// ============================================================================

/**
 * Calculate the status of an item
 */
export function calculateItemStatus(item: Item): ItemStatus {
  if (item.dueDate && isOverdue(item.dueDate)) {
    return "overdue";
  }

  if (item.borrowedDate && !item.returnedDate) {
    return "borrowed";
  }

  return "available";
}
/**
 * Convert Item to ItemWithDetails by adding computed properties
 */
export function enrichItem(item: Item, friend: Friend): ItemWithDetails {
  const status = calculateItemStatus(item);
  const daysUntilDueValue = item.dueDate
    ? daysUntilDue(item.dueDate)
    : undefined;
  const daysBorrowedValue = daysBorrowed(item.borrowedDate, item.returnedDate);

  return {
    ...item,
    status,
    friend,
    daysUntilDue: daysUntilDueValue,
    daysBorrowed: daysBorrowedValue,
  };
}

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate initials from a name (e.g., "John Doe" -> "JD")
 */
export function getInitials(name: string): string {
  if (!name) return "?";

  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/**
 * Pluralize a word based on count
 */
export function pluralize(word: string, count: number, suffix = "s"): string {
  return count === 1 ? word : word + suffix;
}

/**
 * Format a count with plural word (e.g., "1 item", "3 items")
 */
export function formatCount(
  count: number,
  singular: string,
  plural?: string
): string {
  const word = count === 1 ? singular : plural || singular + "s";
  return `${count} ${word}`;
}

// ============================================================================
// Search and Filter Utilities
// ============================================================================

/**
 * Perform case-insensitive search in a string
 */
export function searchInString(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

/**
 * Search for items by query
 */
export function searchItems(items: Item[], query: string): Item[] {
  if (!query.trim()) return items;

  const lowerQuery = query.toLowerCase();
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(lowerQuery) ||
      item.description?.toLowerCase().includes(lowerQuery) ||
      item.category.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Search for friends by query
 */
export function searchFriends(friends: Friend[], query: string): Friend[] {
  if (!query.trim()) return friends;

  const lowerQuery = query.toLowerCase();
  return friends.filter(
    (friend) =>
      friend.name.toLowerCase().includes(lowerQuery) ||
      friend.email?.toLowerCase().includes(lowerQuery) ||
      friend.phone?.toLowerCase().includes(lowerQuery)
  );
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Check if a string is a valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a string is a valid UUID
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ============================================================================
// Array Utilities
// ============================================================================

/**
 * Remove duplicates from an array
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * Group an array by a key function
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

/**
 * Sort array by a key function
 */
export function sortBy<T>(
  array: T[],
  keyFn: (item: T) => string | number | Date,
  order: "asc" | "desc" = "asc"
): T[] {
  return [...array].sort((a, b) => {
    const aVal = keyFn(a);
    const bVal = keyFn(b);

    if (aVal < bVal) return order === "asc" ? -1 : 1;
    if (aVal > bVal) return order === "asc" ? 1 : -1;
    return 0;
  });
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a simple unique ID (for local use only, not cryptographically secure)
 * For production, use proper UUIDs from a library or backend
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a UUID v4 (simple implementation)
 * For production, use a proper UUID library like 'uuid'
 */
export function generateUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// Number Utilities
// ============================================================================

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ============================================================================
// Object Utilities
// ============================================================================

/**
 * Deep clone an object (simple implementation)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if two objects are equal (shallow comparison)
 */
export function shallowEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== "object" || typeof obj2 !== "object") return false;
  if (obj1 === null || obj2 === null) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (obj1[key as keyof typeof obj1] !== obj2[key as keyof typeof obj2]) {
      return false;
    }
  }

  return true;
}

/**
 * Remove undefined and null values from an object
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, value]) => value !== undefined && value !== null
    )
  ) as Partial<T>;
}

// ============================================================================
// Debounce
// ============================================================================

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// ============================================================================
// Color Utilities
// ============================================================================

/**
 * Generate a consistent color from a string (for avatars, etc.)
 */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

// ============================================================================
// Platform Utilities
// ============================================================================

/**
 * Check if running on web
 */
export function isWeb(): boolean {
  return (
    typeof window !== "undefined" && typeof window.document !== "undefined"
  );
}

/**
 * Check if running on mobile (iOS or Android)
 */
export function isMobile(): boolean {
  return !isWeb();
}
