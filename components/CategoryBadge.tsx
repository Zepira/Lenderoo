/**
 * CategoryBadge Component
 *
 * Displays a visual badge for item categories with icon and label
 */

import { View } from 'react-native'
import * as LucideIcons from 'lucide-react-native'
import type { ItemCategory } from 'lib/types'
import { CATEGORY_ICONS, CATEGORY_LABELS } from 'lib/constants'
import { Badge } from '@/components/ui/badge'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

interface CategoryBadgeProps {
  /** The category to display */
  category: ItemCategory
  /** Whether to show the label text */
  showLabel?: boolean
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg'
  /** Additional class names */
  className?: string
}

const categoryColors = {
  book: 'border-blue-500 text-blue-600',
  tool: 'border-orange-500 text-orange-600',
  clothing: 'border-purple-500 text-purple-600',
  electronics: 'border-cyan-500 text-cyan-600',
  game: 'border-pink-500 text-pink-600',
  sports: 'border-green-500 text-green-600',
  kitchen: 'border-yellow-500 text-yellow-600',
  other: 'border-gray-500 text-gray-600',
} as const

export function CategoryBadge({
  category,
  showLabel = true,
  size = 'md',
  className,
}: CategoryBadgeProps) {
  const iconName = CATEGORY_ICONS[category]
  const Icon = (LucideIcons as any)[iconName]
  const label = CATEGORY_LABELS[category]

  const iconSize = {
    sm: 12,
    md: 16,
    lg: 20,
  }[size]

  const colorClass = categoryColors[category]

  return (
    <Badge variant="outline" className={cn('gap-1.5', colorClass, className)}>
      {Icon && <Icon size={iconSize} />}
      {showLabel && (
        <Text className="font-medium">
          {label}
        </Text>
      )}
    </Badge>
  )
}
