/**
 * Validation schemas using Zod
 *
 * These schemas provide runtime validation for forms, API inputs, and data integrity.
 * They correspond to the TypeScript types defined in types.ts.
 */

import { z } from 'zod'

// ============================================================================
// Enums and Literals
// ============================================================================

export const itemCategorySchema = z.enum([
  'book',
  'tool',
  'clothing',
  'electronics',
  'game',
  'sports',
  'kitchen',
  'other',
])

export const itemStatusSchema = z.enum(['borrowed', 'returned', 'overdue'])

export const itemSortOptionSchema = z.enum([
  'dateNewest',
  'dateOldest',
  'nameAsc',
  'nameDesc',
  'dueDateSoonest',
  'dueDateLatest',
])

export const friendSortOptionSchema = z.enum([
  'nameAsc',
  'nameDesc',
  'mostItems',
  'leastItems',
])

export const notificationTypeSchema = z.enum([
  'dueSoon',
  'overdue',
  'returned',
  'reminder',
])

export const themeSchema = z.enum(['light', 'dark', 'system'])

// ============================================================================
// Core Data Schemas
// ============================================================================

/**
 * User schema
 */
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
  avatarUrl: z.string().url().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Friend schema
 */
export const friendSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  avatarUrl: z.string().url().optional(),
  totalItemsBorrowed: z.number().int().nonnegative().default(0),
  currentItemsBorrowed: z.number().int().nonnegative().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Item schema
 */
export const itemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1, 'Item name is required').max(200),
  description: z.string().max(1000).optional(),
  category: itemCategorySchema,
  imageUrl: z.string().url().optional(),
  imageUrls: z.array(z.string().url()).optional(),
  borrowedBy: z.string().uuid(),
  borrowedDate: z.date(),
  dueDate: z.date().optional(),
  returnedDate: z.date().optional(),
  notes: z.string().max(1000).optional(),
  value: z.number().positive().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Borrow history schema
 */
export const borrowHistorySchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
  friendId: z.string().uuid(),
  borrowedDate: z.date(),
  dueDate: z.date().optional(),
  returnedDate: z.date().optional(),
  notes: z.string().max(1000).optional(),
  createdAt: z.date(),
})

// ============================================================================
// Form Input Schemas
// ============================================================================

/**
 * Schema for creating a new item
 */
export const createItemSchema = z
  .object({
    name: z.string().min(1, 'Item name is required').max(200),
    description: z.string().max(1000).optional(),
    category: itemCategorySchema,
    imageUrl: z.string().url().optional(),
    imageUrls: z.array(z.string().url()).optional(),
    borrowedBy: z.string().uuid('Please select a friend'),
    borrowedDate: z.date(),
    dueDate: z.date().optional(),
    notes: z.string().max(1000).optional(),
    value: z.number().positive().optional(),
  })
  .refine(
    (data) => {
      // If due date is provided, it must be after borrowed date
      if (data.dueDate && data.borrowedDate) {
        return data.dueDate >= data.borrowedDate
      }
      return true
    },
    {
      message: 'Due date must be after borrowed date',
      path: ['dueDate'],
    }
  )

/**
 * Schema for updating an existing item
 */
export const updateItemSchema = z
  .object({
    name: z.string().min(1, 'Item name is required').max(200).optional(),
    description: z.string().max(1000).optional(),
    category: itemCategorySchema.optional(),
    imageUrl: z.string().url().optional(),
    imageUrls: z.array(z.string().url()).optional(),
    borrowedBy: z.string().uuid().optional(),
    borrowedDate: z.date().optional(),
    dueDate: z.date().optional(),
    returnedDate: z.date().optional(),
    notes: z.string().max(1000).optional(),
    value: z.number().positive().optional(),
  })
  .refine(
    (data) => {
      // If due date is provided, it must be after borrowed date
      if (data.dueDate && data.borrowedDate) {
        return data.dueDate >= data.borrowedDate
      }
      return true
    },
    {
      message: 'Due date must be after borrowed date',
      path: ['dueDate'],
    }
  )
  .refine(
    (data) => {
      // If returned date is provided, it must be after borrowed date
      if (data.returnedDate && data.borrowedDate) {
        return data.returnedDate >= data.borrowedDate
      }
      return true
    },
    {
      message: 'Returned date must be after borrowed date',
      path: ['returnedDate'],
    }
  )

/**
 * Schema for creating a new friend
 */
export const createFriendSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  avatarUrl: z.string().url().optional(),
})

/**
 * Schema for updating an existing friend
 */
export const updateFriendSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  avatarUrl: z.string().url().optional(),
})

/**
 * Schema for marking an item as returned
 */
export const returnItemSchema = z.object({
  itemId: z.string().uuid(),
  returnedDate: z.date().optional(),
  notes: z.string().max(1000).optional(),
})

// ============================================================================
// Filter and Query Schemas
// ============================================================================

/**
 * Schema for item filters
 */
export const itemFiltersSchema = z.object({
  category: itemCategorySchema.optional(),
  friendId: z.string().uuid().optional(),
  status: itemStatusSchema.optional(),
  searchQuery: z.string().optional(),
  dateRange: z
    .object({
      start: z.date(),
      end: z.date(),
    })
    .optional(),
})

/**
 * Schema for friend filters
 */
export const friendFiltersSchema = z.object({
  searchQuery: z.string().optional(),
  hasActiveLoans: z.boolean().optional(),
})

/**
 * Schema for pagination parameters
 */
export const paginationSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
})

// ============================================================================
// Settings Schema
// ============================================================================

/**
 * Schema for user settings
 */
export const userSettingsSchema = z.object({
  userId: z.string().uuid(),
  theme: themeSchema,
  notificationsEnabled: z.boolean().default(true),
  reminderDaysBefore: z.number().int().positive().max(30).default(3),
  overdueNotificationsEnabled: z.boolean().default(true),
  defaultCategory: itemCategorySchema.optional(),
  requireDueDate: z.boolean().default(false),
  defaultItemView: z.enum(['list', 'grid']).default('list'),
  defaultItemSort: itemSortOptionSchema.default('dateNewest'),
  defaultFriendSort: friendSortOptionSchema.default('nameAsc'),
})

// ============================================================================
// Notification Schema
// ============================================================================

/**
 * Schema for notifications
 */
export const notificationSchema = z.object({
  id: z.string().uuid(),
  type: notificationTypeSchema,
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  itemId: z.string().uuid().optional(),
  friendId: z.string().uuid().optional(),
  scheduledFor: z.date(),
  sent: z.boolean().default(false),
  createdAt: z.date(),
})

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Safe parse with typed error handling
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

/**
 * Get friendly error messages from Zod errors
 */
export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const issue of error.issues) {
    const path = issue.path.join('.')
    errors[path] = issue.message
  }

  return errors
}

/**
 * Validate and throw on error
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data)
}

// ============================================================================
// Export Type Inference
// ============================================================================

// Infer TypeScript types from Zod schemas for consistency
export type UserSchemaType = z.infer<typeof userSchema>
export type FriendSchemaType = z.infer<typeof friendSchema>
export type ItemSchemaType = z.infer<typeof itemSchema>
export type BorrowHistorySchemaType = z.infer<typeof borrowHistorySchema>
export type CreateItemSchemaType = z.infer<typeof createItemSchema>
export type UpdateItemSchemaType = z.infer<typeof updateItemSchema>
export type CreateFriendSchemaType = z.infer<typeof createFriendSchema>
export type UpdateFriendSchemaType = z.infer<typeof updateFriendSchema>
export type ReturnItemSchemaType = z.infer<typeof returnItemSchema>
export type ItemFiltersSchemaType = z.infer<typeof itemFiltersSchema>
export type FriendFiltersSchemaType = z.infer<typeof friendFiltersSchema>
export type UserSettingsSchemaType = z.infer<typeof userSettingsSchema>
export type NotificationSchemaType = z.infer<typeof notificationSchema>
