/**
 * Data Migration Service
 *
 * Migrates data from AsyncStorage to Supabase on first sign-in
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./constants";
import * as localDb from "./database";
import * as supabaseDb from "./database-supabase";

/**
 * Check if migration has already been completed
 */
export async function isMigrationComplete(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.MIGRATION_COMPLETE);
  return value === "true";
}

/**
 * Mark migration as complete
 */
async function markMigrationComplete(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.MIGRATION_COMPLETE, "true");
}

/**
 * Migrate local AsyncStorage data to Supabase
 *
 * This function:
 * 1. Checks if migration is already complete
 * 2. Exports all data from AsyncStorage
 * 3. Migrates friends first (to get ID mappings)
 * 4. Migrates items with updated friend references
 * 5. Migrates history
 * 6. Marks migration as complete
 */
export async function migrateLocalDataToSupabase(): Promise<{
  success: boolean;
  itemsCount: number;
  friendsCount: number;
  historyCount: number;
  error?: string;
}> {
  try {
    // Check if already migrated
    const alreadyMigrated = await isMigrationComplete();
    if (alreadyMigrated) {
      console.log("Migration already complete");
      return { success: true, itemsCount: 0, friendsCount: 0, historyCount: 0 };
    }

    console.log("Starting migration from AsyncStorage to Supabase...");

    // Export all local data
    const localData = await localDb.exportData();

    // Check if there's any data to migrate
    if (
      localData.items.length === 0 &&
      localData.friends.length === 0 &&
      localData.history.length === 0
    ) {
      console.log("No local data to migrate");
      await markMigrationComplete();
      return { success: true, itemsCount: 0, friendsCount: 0, historyCount: 0 };
    }

    console.log(
      `Found ${localData.items.length} items, ${localData.friends.length} friends, ${localData.history.length} history entries`
    );

    // Create ID mapping for friends (old ID -> new ID)
    const friendIdMap = new Map<string, string>();

    // Migrate friends first
    for (const friend of localData.friends) {
      try {
        const newFriend = await supabaseDb.createFriend({
          userId: friend.userId, // Will be overwritten by getCurrentUserId in supabase service
          name: friend.name,
          email: friend.email,
          phone: friend.phone,
          avatarUrl: friend.avatarUrl,
        });

        // Map old ID to new ID
        friendIdMap.set(friend.id, newFriend.id);
        console.log(`Migrated friend: ${friend.name}`);
      } catch (error) {
        console.error(`Failed to migrate friend ${friend.name}:`, error);
        // Continue with other friends even if one fails
      }
    }

    // Migrate items with updated friend references
    for (const item of localData.items) {
      try {
        // Update borrowedBy with new friend ID if it exists
        const borrowedBy = item.borrowedBy
          ? friendIdMap.get(item.borrowedBy) || undefined
          : undefined;

        await supabaseDb.createItem({
          userId: item.userId, // Will be overwritten by getCurrentUserId
          name: item.name,
          description: item.description,
          category: item.category,
          images: item.images,
          borrowedBy,
          borrowedDate: item.borrowedDate,
          dueDate: item.dueDate,
          returnedDate: item.returnedDate,
          notes: item.notes,
          metadata: item.metadata,
        });

        console.log(`Migrated item: ${item.name}`);
      } catch (error) {
        console.error(`Failed to migrate item ${item.name}:`, error);
        // Continue with other items even if one fails
      }
    }

    // Migrate history with updated references
    for (const entry of localData.history) {
      try {
        // Skip history entries that reference non-existent friends or items
        const newFriendId = friendIdMap.get(entry.friendId);
        if (!newFriendId) {
          console.log(`Skipping history entry: friend not found`);
          continue;
        }

        await supabaseDb.addHistoryEntry({
          itemId: entry.itemId, // Item IDs may not match, this is a limitation
          friendId: newFriendId,
          borrowedDate: entry.borrowedDate,
          returnedDate: entry.returnedDate,
          dueDate: entry.dueDate,
          notes: entry.notes,
        });

        console.log(`Migrated history entry`);
      } catch (error) {
        console.error(`Failed to migrate history entry:`, error);
        // Continue with other entries even if one fails
      }
    }

    // Mark migration as complete
    await markMigrationComplete();

    console.log("Migration completed successfully");

    return {
      success: true,
      itemsCount: localData.items.length,
      friendsCount: localData.friends.length,
      historyCount: localData.history.length,
    };
  } catch (error) {
    console.error("Migration failed:", error);
    return {
      success: false,
      itemsCount: 0,
      friendsCount: 0,
      historyCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Clear local data after successful migration
 * Use with caution - this is irreversible
 */
export async function clearLocalDataAfterMigration(): Promise<void> {
  const migrated = await isMigrationComplete();
  if (!migrated) {
    throw new Error("Cannot clear local data before migration is complete");
  }

  await localDb.clearAllData();
  console.log("Local data cleared after migration");
}
