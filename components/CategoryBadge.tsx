/**
 * CategoryBadge Component
 *
 * Displays a visual badge for item categories with icon and label
 */

import { XStack, Text, type XStackProps, getTokens } from 'tamagui'
import * as Icons from '@tamagui/lucide-icons'
import type { ItemCategory } from 'lib/types'
import { CATEGORY_ICONS, CATEGORY_LABELS } from 'lib/constants'

interface CategoryBadgeProps extends Omit<XStackProps, 'children'> {
  /** The category to display */
  category: ItemCategory
  /** Whether to show the label text */
  showLabel?: boolean
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg'
}

export function CategoryBadge({
  category,
  showLabel = true,
  size = 'md',
  ...props
}: CategoryBadgeProps) {
  const iconName = CATEGORY_ICONS[category] as keyof typeof Icons
  const Icon = Icons[iconName]
  const label = CATEGORY_LABELS[category]

  // Use token colors
  const colorToken = {
    book: '$blue9',
    tool: '$orange9',
    clothing: '$purple9',
    electronics: '$cyan9',
    game: '$pink9',
    sports: '$green9',
    kitchen: '$yellow9',
    other: '$gray9',
  }[category]

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
