/**
 * EmptyState Component
 *
 * Generic empty state component for lists and screens
 */

import { View } from "react-native";
import * as LucideIcons from "lucide-react-native";
import { Plus } from "lucide-react-native";
import type { ComponentType } from "react";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  /** Icon to display (Lucide icon name) */
  icon?: string;
  /** Title text */
  title: string;
  /** Description/message text */
  message?: string;
  /** Optional action button text */
  actionLabel?: string;
  /** Action button press handler */
  onAction?: () => void;
  /** Custom icon component (overrides icon prop) */
  IconComponent?: ComponentType<{ size?: number; color?: string }>;
}

export function EmptyState({
  icon = "Package",
  title,
  message,
  actionLabel,
  onAction,
  IconComponent,
}: EmptyStateProps) {
  const Icon = IconComponent || (LucideIcons as any)[icon];

  return (
    <View className="flex-1 items-center justify-center p-6 gap-4">
      {Icon && (
        <View className="w-20 h-20 items-center justify-center bg-background rounded-2xl border-2 border-border">
          <Icon size={40} color="#888" />
        </View>
      )}

      <View className="gap-2 items-center max-w-xs">
        <Text variant="h4" className="text-center">
          {title}
        </Text>

        {message && (
          <Text variant="muted" className="text-center">
            {message}
          </Text>
        )}
      </View>

      {actionLabel && onAction && (
        <Button onPress={onAction} className="mt-2">
          <Plus size={16} />
          <Text>{actionLabel}</Text>
        </Button>
      )}
    </View>
  );
}
