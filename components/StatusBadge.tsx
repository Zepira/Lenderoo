/**
 * StatusBadge Component
 *
 * Displays the status of an item (borrowed, returned, overdue)
 */

import { XStack, Text, type XStackProps } from 'tamagui'
import * as Icons from '@tamagui/lucide-icons'
import type { ItemStatus } from 'lib/types'
import { STATUS_LABELS, STATUS_ICONS } from 'lib/constants'

interface StatusBadgeProps extends Omit<XStackProps, 'children'> {
  /** The status to display */
  status: ItemStatus
  /** Whether to show the label text */
  showLabel?: boolean
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg'
}

export function StatusBadge({
  status,
  showLabel = true,
  size = 'md',
  ...props
}: StatusBadgeProps) {
  const iconName = STATUS_ICONS[status] as keyof typeof Icons
  const Icon = Icons[iconName]
  const label = STATUS_LABELS[status]

  const colorToken = {
    borrowed: '$blue9',
    returned: '$green9',
    overdue: '$red9',
  }[status]

  const iconSize = {
    sm: 12,
    md: 16,
    lg: 20,
  }[size]

  const fontSize = {
    sm: '$2',
    md: '$3',
    lg: '$4',
  }[size] as '$2' | '$3' | '$4'

  const padding = {
    sm: '$1.5',
    md: '$2',
    lg: '$2.5',
  }[size] as '$1.5' | '$2' | '$2.5'

  return (
    <XStack
      items="center"
      gap="$1.5"
      bg="$background"
      borderWidth={1}
      borderColor={colorToken}
      rounded="$3"
      px={padding}
      py={size === 'sm' ? '$1' : '$1.5'}
      {...props}
    >
      {Icon && <Icon size={iconSize} color={colorToken} />}
      {showLabel && (
        <Text fontSize={fontSize} color={colorToken} fontWeight="500">
          {label}
        </Text>
      )}
    </XStack>
  )
}
