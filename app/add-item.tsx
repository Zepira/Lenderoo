import { useState } from 'react'
import { Stack, useRouter } from 'expo-router'
import {
  YStack,
  XStack,
  Text,
  Input,
  TextArea,
  Button,
  ScrollView,
  Select,
  Adapt,
  Sheet,
  Label,
} from 'tamagui'
import { Check, ChevronDown } from '@tamagui/lucide-icons'
import { useFriends, useCreateItem } from 'hooks'
import { CATEGORY_CONFIG, type ItemCategory } from 'lib/constants'
import { createItemSchema } from 'lib/validation'
import type { z } from 'zod'
import { Platform } from 'react-native'

export default function AddItemScreen() {
  const router = useRouter()
  const { friends } = useFriends()
  const { createItem, loading } = useCreateItem()

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ItemCategory>('other')
  const [borrowedBy, setBorrowedBy] = useState('')
  const [borrowedDate, setBorrowedDate] = useState(new Date())
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [notes, setNotes] = useState('')

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async () => {
    try {
      // Clear previous errors
      setErrors({})

      // Validate with Zod
      const itemData = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        borrowedBy,
        borrowedDate,
        dueDate,
        notes: notes.trim() || undefined,
      }

      createItemSchema.parse(itemData)

      // Create item
      await createItem({
        ...itemData,
        userId: 'demo-user', // TODO: Replace with real user ID from auth
      })

      // Navigate back
      router.back()
    } catch (error) {
      if (error && typeof error === 'object' && 'issues' in error) {
        // Zod validation error
        const zodError = error as { issues: Array<{ path: Array<string | number>; message: string }> }
        const fieldErrors: Record<string, string> = {}
        zodError.issues.forEach((err) => {
          if (err.path.length > 0) {
            fieldErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        console.error('Failed to create item:', error)
        setErrors({ general: 'Failed to create item. Please try again.' })
      }
    }
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Item',
          presentation: 'modal',
          headerLeft: () => (
            <Button chromeless onPress={handleCancel} disabled={loading}>
              Cancel
            </Button>
          ),
        }}
      />

      <ScrollView flex={1} bg="$background">
        <YStack p="$4" gap="$4">
          {errors.general && (
            <YStack p="$3" bg="$red2" rounded="$3" borderWidth={1} borderColor="$red7">
              <Text color="$red11" fontSize="$3">
                {errors.general}
              </Text>
            </YStack>
          )}

          {/* Item Name */}
          <YStack gap="$2">
            <Label htmlFor="name" fontSize="$4" fontWeight="600">
              Item Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChangeText={setName}
              placeholder="e.g., The Lean Startup, Power Drill, Winter Jacket"
              borderColor={errors.name ? '$red7' : '$borderColor'}
              disabled={loading}
            />
            {errors.name && (
              <Text color="$red10" fontSize="$2">
                {errors.name}
              </Text>
            )}
          </YStack>

          {/* Description */}
          <YStack gap="$2">
            <Label htmlFor="description" fontSize="$4" fontWeight="600">
              Description
            </Label>
            <TextArea
              id="description"
              value={description}
              onChangeText={setDescription}
              placeholder="Add any details about the item..."
              numberOfLines={3}
              borderColor={errors.description ? '$red7' : '$borderColor'}
              disabled={loading}
            />
            {errors.description && (
              <Text color="$red10" fontSize="$2">
                {errors.description}
              </Text>
            )}
          </YStack>

          {/* Category */}
          <YStack gap="$2">
            <Label htmlFor="category" fontSize="$4" fontWeight="600">
              Category *
            </Label>
            <Select
              id="category"
              value={category}
              onValueChange={(value) => setCategory(value as ItemCategory)}
            >
              <Select.Trigger iconAfter={ChevronDown}>
                <Select.Value placeholder="Select a category" />
              </Select.Trigger>

              <Adapt when="sm" platform="touch">
                <Sheet
                  native={Platform.OS === 'ios'}
                  modal
                  dismissOnSnapToBottom
                  animationConfig={{
                    type: 'spring',
                    damping: 20,
                    mass: 1.2,
                    stiffness: 250,
                  }}
                >
                  <Sheet.Frame>
                    <Sheet.ScrollView>
                      <Adapt.Contents />
                    </Sheet.ScrollView>
                  </Sheet.Frame>
                  <Sheet.Overlay
                    animation="lazy"
                    enterStyle={{ opacity: 0 }}
                    exitStyle={{ opacity: 0 }}
                  />
                </Sheet>
              </Adapt>

              <Select.Content>
                <Select.ScrollUpButton items="center" justify="center" position="relative" width="100%" height="$3">
                  <YStack>
                    <ChevronDown size={20} />
                  </YStack>
                </Select.ScrollUpButton>

                <Select.Viewport minW={200}>
                  <Select.Group>
                    <Select.Label>Categories</Select.Label>
                    {Object.entries(CATEGORY_CONFIG).map(([key, config], idx) => (
                      <Select.Item key={key} index={idx} value={key}>
                        <Select.ItemText>{config.label}</Select.ItemText>
                        <Select.ItemIndicator marginLeft="auto">
                          <Check size={16} />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Group>
                </Select.Viewport>

                <Select.ScrollDownButton items="center" justify="center" position="relative" width="100%" height="$3">
                  <YStack>
                    <ChevronDown size={20} />
                  </YStack>
                </Select.ScrollDownButton>
              </Select.Content>
            </Select>
            {errors.category && (
              <Text color="$red10" fontSize="$2">
                {errors.category}
              </Text>
            )}
          </YStack>

          {/* Friend Selector */}
          <YStack gap="$2">
            <Label htmlFor="borrowedBy" fontSize="$4" fontWeight="600">
              Lent To *
            </Label>
            {friends.length === 0 ? (
              <YStack gap="$2">
                <Text color="$gray11" fontSize="$3">
                  You haven't added any friends yet.
                </Text>
                <Button
                  size="$3"
                  chromeless
                  onPress={() => router.push('/add-friend' as any)}
                >
                  Add a Friend First
                </Button>
              </YStack>
            ) : (
              <>
                <Select
                  id="borrowedBy"
                  value={borrowedBy}
                  onValueChange={setBorrowedBy}
                >
                  <Select.Trigger iconAfter={ChevronDown}>
                    <Select.Value placeholder="Select a friend" />
                  </Select.Trigger>

                  <Adapt when="sm" platform="touch">
                    <Sheet
                      native={Platform.OS === 'ios'}
                      modal
                      dismissOnSnapToBottom
                      animationConfig={{
                        type: 'spring',
                        damping: 20,
                        mass: 1.2,
                        stiffness: 250,
                      }}
                    >
                      <Sheet.Frame>
                        <Sheet.ScrollView>
                          <Adapt.Contents />
                        </Sheet.ScrollView>
                      </Sheet.Frame>
                      <Sheet.Overlay
                        animation="lazy"
                        enterStyle={{ opacity: 0 }}
                        exitStyle={{ opacity: 0 }}
                      />
                    </Sheet>
                  </Adapt>

                  <Select.Content>
                    <Select.ScrollUpButton items="center" justify="center" position="relative" width="100%" height="$3">
                      <YStack>
                        <ChevronDown size={20} />
                      </YStack>
                    </Select.ScrollUpButton>

                    <Select.Viewport minW={200}>
                      <Select.Group>
                        <Select.Label>Friends</Select.Label>
                        {friends.map((friend, idx) => (
                          <Select.Item key={friend.id} index={idx} value={friend.id}>
                            <Select.ItemText>{friend.name}</Select.ItemText>
                            <Select.ItemIndicator marginLeft="auto">
                              <Check size={16} />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Group>
                    </Select.Viewport>

                    <Select.ScrollDownButton items="center" justify="center" position="relative" width="100%" height="$3">
                      <YStack>
                        <ChevronDown size={20} />
                      </YStack>
                    </Select.ScrollDownButton>
                  </Select.Content>
                </Select>
                {errors.borrowedBy && (
                  <Text color="$red10" fontSize="$2">
                    {errors.borrowedBy}
                  </Text>
                )}
              </>
            )}
          </YStack>

          {/* Date Information */}
          <YStack gap="$2">
            <Text fontSize="$4" fontWeight="600">
              Dates
            </Text>
            <YStack gap="$3" p="$3" bg="$gray4" rounded="$3">
              <XStack justify="space-between" items="center">
                <Text fontSize="$3" color="$gray12">
                  Borrowed Date
                </Text>
                <Text fontSize="$3" fontWeight="500">
                  {borrowedDate.toLocaleDateString()}
                </Text>
              </XStack>
              <Text fontSize="$2" color="$gray11">
                Date pickers coming soon. Currently defaults to today.
              </Text>
            </YStack>
          </YStack>

          {/* Notes */}
          <YStack gap="$2">
            <Label htmlFor="notes" fontSize="$4" fontWeight="600">
              Notes
            </Label>
            <TextArea
              id="notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes or conditions..."
              numberOfLines={2}
              borderColor={errors.notes ? '$red7' : '$borderColor'}
              disabled={loading}
            />
            {errors.notes && (
              <Text color="$red10" fontSize="$2">
                {errors.notes}
              </Text>
            )}
          </YStack>

          {/* Action Buttons */}
          <XStack gap="$3" pt="$4">
            <Button flex={1} variant="outlined" onPress={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              flex={1}
              bg="$blue10"
              color="white"
              onPress={handleSubmit}
              disabled={loading || friends.length === 0}
            >
              {loading ? 'Saving...' : 'Add Item'}
            </Button>
          </XStack>
        </YStack>
      </ScrollView>
    </>
  )
}
