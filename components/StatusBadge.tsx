/**
 * StatusBadge Component
 *
 * Displays the status of an item (borrowed, returned, overdue, available, requested)
 */

import * as LucideIcons from 'lucide-react-native'
import type { ItemStatus } from 'lib/types'
import { STATUS_LABELS, STATUS_ICONS } from 'lib/constants'
import { Badge } from '@/components/ui/badge'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  /** The status to display */
  status: ItemStatus
  /** Whether to show the label text */
  showLabel?: boolean
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg'
  /** Additional class names */
  className?: string
}

const statusColors = {
  borrowed: 'border-blue-500 text-blue-600',
  returned: 'border-green-500 text-green-600',
  overdue: 'border-red-500 text-red-600',
  available: 'border-green-500 text-green-600',
  requested: 'border-yellow-500 text-yellow-600',
} as const

export function StatusBadge({
  status,
  showLabel = true,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const iconName = STATUS_ICONS[status]
  const Icon = (LucideIcons as any)[iconName]
  const label = STATUS_LABELS[status]

  const iconSize = {
    sm: 12,
    md: 16,
    lg: 20,
  }[size]

  const colorClass = statusColors[status]

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
