/**
 * SearchBar Component
 *
 * Reusable search input component with clear button
 */

import { XStack, Input, type InputProps, Button } from 'tamagui'
import * as Icons from '@tamagui/lucide-icons'

interface SearchBarProps extends Omit<InputProps, 'value' | 'onChangeText'> {
  /** Current search value */
  value: string
  /** Handler when search value changes */
  onChangeText: (text: string) => void
  /** Handler when clear button is pressed */
  onClear?: () => void
  /** Placeholder text */
  placeholder?: string
}

export function SearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search...',
  ...props
}: SearchBarProps) {
  const handleClear = () => {
    onChangeText('')
    onClear?.()
  }

  return (
    <XStack
      items="center"
      gap="$2"
      bg="$background"
      borderWidth={1}
      borderColor="$borderColor"
      rounded="$4"
      pl="$3"
      pr="$2"
      py="$2"
    >
      <Icons.Search size={20} color="$gray10" />

      <Input
        flex={1}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="$gray10"
        borderWidth={0}
        p={0}
        fontSize="$4"
        unstyled
        {...props}
      />

      {value.length > 0 && (
        <Button
          size="$2"
          circular
          chromeless
          icon={Icons.X}
          onPress={handleClear}
          pressStyle={{ opacity: 0.6 }}
        />
      )}
    </XStack>
  )
}
