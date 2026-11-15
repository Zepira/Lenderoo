import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ItemAudience } from 'lib/types'
import {
  getDefaultAudience,
  getFriendGroups,
  getItemAudience,
  getItemAudiences,
  setItemAudience,
} from '@/lib/services/friend-groups'
import { EVERYONE, audienceToSave } from 'lib/visibility'
import { useFriends } from './useFriends'
import { queryKeys } from 'lib/query-client'

/** Your friend groups (owner only). */
export function useFriendGroups() {
  const result = useQuery({ queryKey: queryKeys.groups.all, queryFn: getFriendGroups })
  return {
    groups: result.data ?? [],
    loading: result.isLoading,
    error: result.error,
    refresh: result.refetch,
  }
}

/** Who can see one of your items. */
export function useItemAudience(itemId: string | null | undefined, enabled = true) {
  const result = useQuery({
    queryKey: queryKeys.groups.item(itemId ?? ''),
    queryFn: () => getItemAudience(itemId as string),
    enabled: !!itemId && enabled,
  })
  return { audience: result.data, loading: result.isLoading }
}

/** Rules for all your items, keyed by item id. */
export function useItemAudiences(enabled = true) {
  const result = useQuery({
    queryKey: queryKeys.groups.items,
    queryFn: getItemAudiences,
    enabled,
  })
  return { audiences: result.data ?? ({} as Record<string, ItemAudience>), loading: result.isLoading }
}

/** Your default for new items. */
export function useDefaultAudience() {
  const result = useQuery({ queryKey: queryKeys.groups.default, queryFn: getDefaultAudience })
  return { defaultAudience: result.data, loading: result.isLoading }
}

/** Refresh everything group-related, plus item lists (visibility changes what friends see). */
export function useInvalidateGroups() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['groups'] })
  }
}

/**
 * The "Who can see this" field on an item form. New items start from your default (the
 * database applies it on insert too); edits start from the item's rule. `save(itemId)` writes
 * the rule only if it differs from what the item already has.
 */
export function useAudienceField(itemId?: string) {
  const { groups } = useFriendGroups()
  const { friends } = useFriends()
  const { defaultAudience } = useDefaultAudience()
  const { audience: current } = useItemAudience(itemId)
  const invalidate = useInvalidateGroups()
  const start = itemId ? current : defaultAudience
  const [picked, setPicked] = useState<ItemAudience | null>(null)
  const audience = picked ?? start ?? EVERYONE

  const save = async (savedItemId: string) => {
    const next = audienceToSave(audience, groups)
    const before = audienceToSave(start ?? EVERYONE, groups)
    const same =
      next.visibility === before.visibility &&
      next.groupIds.length === before.groupIds.length &&
      next.groupIds.every((id) => before.groupIds.includes(id))
    if (same) return
    await setItemAudience(savedItemId, next)
    invalidate()
  }

  return {
    audience,
    setAudience: setPicked,
    groups,
    friendIds: friends.map((f) => f.id),
    save,
  }
}
