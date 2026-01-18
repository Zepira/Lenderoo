/**
 * EmptyState Component
 *
 * Generic empty state component for lists and screens
 */

import { YStack, Text, Button } from 'tamagui'
import * as Icons from '@tamagui/lucide-icons'
import type { ComponentType } from 'react'

interface EmptyStateProps {
  /** Icon to display (Lucide icon name) */
  icon?: keyof typeof Icons
  /** Title text */
  title: string
  /** Description/message text */
  message?: string
  /** Optional action button text */
  actionLabel?: string
  /** Action button press handler */
  onAction?: () => void
  /** Custom icon component (overrides icon prop) */
  IconComponent?: ComponentType<{ size?: number; color?: string }>
}

export function EmptyState({
  icon = 'Package',
  title,
  message,
  actionLabel,
  onAction,
  IconComponent,
}: EmptyStateProps) {
  const Icon = IconComponent || (Icons[icon] as ComponentType<{ size?: number; color?: string }>)

  return (
    <YStack flex={1} items="center" justify="center" p="$6" gap="$4">
      {Icon && (
        <YStack
          width={80}
          height={80}
          items="center"
          justify="center"
          bg="$background"
          rounded="$10"
          borderWidth={2}
          borderColor="$borderColor"
        >
          <Icon size={40} color="$gray10" />
        </YStack>
      )}

      <YStack gap="$2" items="center" mw={300}>
        <Text fontSize="$6" fontWeight="600" color="$color" text="center">
          {title}
        </Text>

        {message && (
          <Text fontSize="$4" color="$gray11" text="center" lineHeight={20}>
            {message}
          </Text>
        )}
      </YStack>

      {actionLabel && onAction && (
        <Button
          size="$4"
          themeInverse
          onPress={onAction}
          mt="$2"
          icon={Icons.Plus}
        >
          {actionLabel}
        </Button>
      )}
    </YStack>
  )
}
