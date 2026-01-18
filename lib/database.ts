/**
 * Local Database Service using AsyncStorage
 *
 * Handles all CRUD operations for items, friends, and history
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Item, Friend, BorrowHistory, ItemFilters, FriendFilters } from './types'
import { STORAGE_KEYS } from './constants'
import { generateUuid, searchItems, searchFriends, sortBy } from './utils'

// ============================================================================
// Storage Helper Functions
// ============================================================================

async function getStorageItem<T>(key: string): Promise<T[]> {
  try {
    const jsonValue = await AsyncStorage.getItem(key)
    return jsonValue != null ? JSON.parse(jsonValue) : []
  } catch (error) {
    console.error(`Error reading ${key}:`, error)
    return []
  }
}

async function setStorageItem<T>(key: string, value: T[]): Promise<void> {
  try {
    const jsonValue = JSON.stringify(value)
    await AsyncStorage.setItem(key, jsonValue)
  } catch (error) {
    console.error(`Error writing ${key}:`, error)
    throw error
  }
}

// ============================================================================
// Items Service
// ============================================================================

export async function getAllItems(): Promise<Item[]> {
  return getStorageItem<Item>(STORAGE_KEYS.ITEMS)
}

export async function getItemById(id: string): Promise<Item | null> {
  const items = await getAllItems()
  return items.find((item) => item.id === id) || null
}

export async function createItem(itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item> {
  const items = await getAllItems()

  const newItem: Item = {
    ...itemData,
    id: generateUuid(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  items.push(newItem)
  await setStorageItem(STORAGE_KEYS.ITEMS, items)

  // Update friend's borrow count
  await incrementFriendBorrowCount(itemData.borrowedBy)

  return newItem
}

export async function updateItem(id: string, updates: Partial<Item>): Promise<Item | null> {
  const items = await getAllItems()
  const index = items.findIndex((item) => item.id === id)

  if (index === -1) return null

  const oldItem = items[index]
  const updatedItem: Item = {
    ...oldItem,
    ...updates,
    updatedAt: new Date(),
  }

  items[index] = updatedItem
  await setStorageItem(STORAGE_KEYS.ITEMS, items)

  // If borrowedBy changed, update friend counts
  if (updates.borrowedBy && updates.borrowedBy !== oldItem.borrowedBy) {
    await decrementFriendBorrowCount(oldItem.borrowedBy)
    await incrementFriendBorrowCount(updates.borrowedBy)
  }

  return updatedItem
}

export async function deleteItem(id: string): Promise<boolean> {
  const items = await getAllItems()
  const item = items.find((i) => i.id === id)

  if (!item) return false

  const filteredItems = items.filter((item) => item.id !== id)
  await setStorageItem(STORAGE_KEYS.ITEMS, filteredItems)

  // Decrement friend's borrow count
  await decrementFriendBorrowCount(item.borrowedBy)

  return true
}

export async function getItemsByFriend(friendId: string): Promise<Item[]> {
  const items = await getAllItems()
  return items.filter((item) => item.borrowedBy === friendId)
}

export async function getActiveItems(): Promise<Item[]> {
  const items = await getAllItems()
  return items.filter((item) => !item.returnedDate)
}

export async function getOverdueItems(): Promise<Item[]> {
  const items = await getActiveItems()
  const now = new Date()

  return items.filter((item) => {
    if (!item.dueDate) return false
    return new Date(item.dueDate) < now
  })
}

export async function markItemReturned(id: string, returnedDate?: Date): Promise<Item | null> {
  return updateItem(id, {
    returnedDate: returnedDate || new Date(),
  })
}

export async function queryItems(filters?: ItemFilters): Promise<Item[]> {
  let items = await getAllItems()

  if (!filters) return items

  // Filter by category
  if (filters.category) {
    items = items.filter((item) => item.category === filters.category)
  }

  // Filter by friend
  if (filters.friendId) {
    items = items.filter((item) => item.borrowedBy === filters.friendId)
  }

  // Filter by status
  if (filters.status) {
    const now = new Date()
    items = items.filter((item) => {
      if (filters.status === 'returned') {
        return !!item.returnedDate
      }
      if (filters.status === 'borrowed') {
        return !item.returnedDate && (!item.dueDate || new Date(item.dueDate) >= now)
      }
      if (filters.status === 'overdue') {
        return !item.returnedDate && item.dueDate && new Date(item.dueDate) < now
      }
      return true
    })
  }

  // Search by query
  if (filters.searchQuery) {
    items = searchItems(items, filters.searchQuery)
  }

  // Filter by date range
  if (filters.dateRange) {
    items = items.filter((item) => {
      const borrowedDate = new Date(item.borrowedDate)
      return (
        borrowedDate >= filters.dateRange!.start &&
        borrowedDate <= filters.dateRange!.end
      )
    })
  }

  return items
}

// ============================================================================
// Friends Service
// ============================================================================

export async function getAllFriends(): Promise<Friend[]> {
  return getStorageItem<Friend>(STORAGE_KEYS.FRIENDS)
}

export async function getFriendById(id: string): Promise<Friend | null> {
  const friends = await getAllFriends()
  return friends.find((friend) => friend.id === id) || null
}

export async function createFriend(friendData: Omit<Friend, 'id' | 'totalItemsBorrowed' | 'currentItemsBorrowed' | 'createdAt' | 'updatedAt'>): Promise<Friend> {
  const friends = await getAllFriends()

  const newFriend: Friend = {
    ...friendData,
    id: generateUuid(),
    totalItemsBorrowed: 0,
    currentItemsBorrowed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  friends.push(newFriend)
  await setStorageItem(STORAGE_KEYS.FRIENDS, friends)

  return newFriend
}

export async function updateFriend(id: string, updates: Partial<Friend>): Promise<Friend | null> {
  const friends = await getAllFriends()
  const index = friends.findIndex((friend) => friend.id === id)

  if (index === -1) return null

  const updatedFriend: Friend = {
    ...friends[index],
    ...updates,
    updatedAt: new Date(),
  }

  friends[index] = updatedFriend
  await setStorageItem(STORAGE_KEYS.FRIENDS, friends)

  return updatedFriend
}

export async function deleteFriend(id: string): Promise<boolean> {
  const friends = await getAllFriends()
  const filteredFriends = friends.filter((friend) => friend.id !== id)

  if (friends.length === filteredFriends.length) return false

  await setStorageItem(STORAGE_KEYS.FRIENDS, filteredFriends)

  // Also delete all items borrowed by this friend
  const items = await getAllItems()
  const filteredItems = items.filter((item) => item.borrowedBy !== id)
  await setStorageItem(STORAGE_KEYS.ITEMS, filteredItems)

  return true
}

export async function queryFriends(filters?: FriendFilters): Promise<Friend[]> {
  let friends = await getAllFriends()

  if (!filters) return friends

  // Search by query
  if (filters.searchQuery) {
    friends = searchFriends(friends, filters.searchQuery)
  }

  // Filter by active loans
  if (filters.hasActiveLoans) {
    friends = friends.filter((friend) => friend.currentItemsBorrowed > 0)
  }

  return friends
}

async function incrementFriendBorrowCount(friendId: string): Promise<void> {
  const friend = await getFriendById(friendId)
  if (!friend) return

  await updateFriend(friendId, {
    totalItemsBorrowed: friend.totalItemsBorrowed + 1,
    currentItemsBorrowed: friend.currentItemsBorrowed + 1,
  })
}

async function decrementFriendBorrowCount(friendId: string): Promise<void> {
  const friend = await getFriendById(friendId)
  if (!friend) return

  await updateFriend(friendId, {
    currentItemsBorrowed: Math.max(0, friend.currentItemsBorrowed - 1),
  })
}

// ============================================================================
// History Service
// ============================================================================

export async function getAllHistory(): Promise<BorrowHistory[]> {
  return getStorageItem<BorrowHistory>(STORAGE_KEYS.HISTORY)
}

export async function getHistoryByItem(itemId: string): Promise<BorrowHistory[]> {
  const history = await getAllHistory()
  return history.filter((entry) => entry.itemId === itemId)
}

export async function getHistoryByFriend(friendId: string): Promise<BorrowHistory[]> {
  const history = await getAllHistory()
  return history.filter((entry) => entry.friendId === friendId)
}

export async function addHistoryEntry(entry: Omit<BorrowHistory, 'id' | 'createdAt'>): Promise<BorrowHistory> {
  const history = await getAllHistory()

  const newEntry: BorrowHistory = {
    ...entry,
    id: generateUuid(),
    createdAt: new Date(),
  }

  history.push(newEntry)
  await setStorageItem(STORAGE_KEYS.HISTORY, history)

  return newEntry
}

// ============================================================================
// Bulk Operations
// ============================================================================

export async function clearAllData(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEYS.ITEMS),
    AsyncStorage.removeItem(STORAGE_KEYS.FRIENDS),
    AsyncStorage.removeItem(STORAGE_KEYS.HISTORY),
  ])
}

export async function exportData(): Promise<{
  items: Item[]
  friends: Friend[]
  history: BorrowHistory[]
}> {
  const [items, friends, history] = await Promise.all([
    getAllItems(),
    getAllFriends(),
    getAllHistory(),
  ])

  return { items, friends, history }
}

export async function importData(data: {
  items?: Item[]
  friends?: Friend[]
  history?: BorrowHistory[]
}): Promise<void> {
  const promises: Promise<void>[] = []

  if (data.items) {
    promises.push(setStorageItem(STORAGE_KEYS.ITEMS, data.items))
  }
  if (data.friends) {
    promises.push(setStorageItem(STORAGE_KEYS.FRIENDS, data.friends))
  }
  if (data.history) {
    promises.push(setStorageItem(STORAGE_KEYS.HISTORY, data.history))
  }

  await Promise.all(promises)
}

// ============================================================================
// Seed Data (for development)
// ============================================================================

export async function seedDemoData(): Promise<void> {
  // Check if data already exists
  const existingItems = await getAllItems()
  if (existingItems.length > 0) return

  // Create demo friends
  const john = await createFriend({
    userId: 'demo-user',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '(555) 123-4567',
  })

  const jane = await createFriend({
    userId: 'demo-user',
    name: 'Jane Smith',
    email: 'jane@example.com',
  })

  const bob = await createFriend({
    userId: 'demo-user',
    name: 'Bob Johnson',
  })

  // Create demo items
  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)

  await createItem({
    userId: 'demo-user',
    name: 'The Great Gatsby',
    description: 'Classic American novel',
    category: 'book',
    borrowedBy: john.id,
    borrowedDate: weekAgo,
    dueDate: yesterday, // Overdue!
  })

  await createItem({
    userId: 'demo-user',
    name: 'Power Drill',
    description: 'DeWalt 20V cordless drill',
    category: 'tool',
    borrowedBy: jane.id,
    borrowedDate: threeDaysAgo,
    dueDate: twoWeeksFromNow,
  })

  await createItem({
    userId: 'demo-user',
    name: 'Blue Jacket',
    description: 'Winter jacket, size M',
    category: 'clothing',
    borrowedBy: bob.id,
    borrowedDate: weekAgo,
  })

  await createItem({
    userId: 'demo-user',
    name: 'Nintendo Switch',
    description: 'With Mario Kart',
    category: 'game',
    borrowedBy: john.id,
    borrowedDate: threeDaysAgo,
    dueDate: twoWeeksFromNow,
  })
}
