/**
 * CategoryBadge Component
 *
 * Displays a visual badge for item categories with icon and label
 */

import { View } from 'react-native'
import type { ItemCategory } from 'lib/types'
import { CATEGORY_LABELS } from 'lib/constants'
import { CATEGORY_CONFIG, categoryInk } from '@/lib/category-config'
import { Text } from '@/components/ui/text'
import { useThemeContext } from '@/contexts/ThemeContext'

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

const SIZES = {
  sm: { icon: 12, font: 11, padX: 8, padY: 3 },
  md: { icon: 14, font: 12, padX: 10, padY: 4 },
  lg: { icon: 16, font: 14, padX: 12, padY: 5 },
} as const

// A compact pill in the category's own colour (the same colours as item
// cards and the item screen). Sized to its content: it never stretches to
// fill its parent.
export function CategoryBadge({
  category,
  showLabel = true,
  size = 'md',
  className,
}: CategoryBadgeProps) {
  const { activeTheme } = useThemeContext()
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other
  const ink = categoryInk(category, activeTheme === 'dark')
  const s = SIZES[size]

  return (
    <View
      className={className}
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: s.padX,
        paddingVertical: s.padY,
        borderRadius: 999,
        backgroundColor: `${cfg.color}22`,
      }}
    >
      <cfg.Icon size={s.icon} color={ink} />
      {showLabel && (
        <Text className="font-sans-bold" style={{ fontSize: s.font, lineHeight: s.font + 4, color: ink }}>
          {CATEGORY_LABELS[category]}
        </Text>
      )}
    </View>
  )
}
