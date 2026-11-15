import { useMemo, useState } from 'react'
import type { ItemCategory } from 'lib/types'
import { applyItemFilters, validFilters, type ItemSort } from 'lib/item-filters'

type Filterable = { name: string; category: ItemCategory; createdAt: Date; dueDate?: Date }

/**
 * Category and sort state for an item list. `items` are the list after search (so counts match
 * what's shown); `filtered` is them with the category and sort applied. A choice the list can no
 * longer offer (its category emptied, nothing due) quietly falls back to All / Recently added.
 */
export function useItemFilters<T extends Filterable>(items: T[], initialSort: ItemSort = 'recent') {
  const [picked, setPicked] = useState<{ category: ItemCategory | null; sort: ItemSort }>({
    category: null,
    sort: initialSort,
  })
  const current = useMemo(() => validFilters(items, picked), [items, picked])
  const filtered = useMemo(() => applyItemFilters(items, current), [items, current])
  return {
    category: current.category,
    sort: current.sort,
    setCategory: (category: ItemCategory | null) => setPicked((p) => ({ ...p, category })),
    setSort: (sort: ItemSort) => setPicked((p) => ({ ...p, sort })),
    filtered,
  }
}
