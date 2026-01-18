import { useState } from 'react'
import { Stack, useRouter } from 'expo-router'
import { YStack, XStack, Text, Input, Button, ScrollView, Label } from 'tamagui'
import { useCreateFriend } from 'hooks'
import { createFriendSchema } from 'lib/validation'
import type { z } from 'zod'

export default function AddFriendScreen() {
  const router = useRouter()
  const { createFriend, loading } = useCreateFriend()

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async () => {
    try {
      // Clear previous errors
      setErrors({})

      // Validate with Zod
      const friendData = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      }

      createFriendSchema.parse(friendData)

      // Create friend
      await createFriend({
        ...friendData,
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
        console.error('Failed to create friend:', error)
        setErrors({ general: 'Failed to add friend. Please try again.' })
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
          title: 'Add Friend',
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

          {/* Name */}
          <YStack gap="$2">
            <Label htmlFor="name" fontSize="$4" fontWeight="600">
              Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChangeText={setName}
              placeholder="e.g., John Doe"
              borderColor={errors.name ? '$red7' : '$borderColor'}
              disabled={loading}
              autoFocus
            />
            {errors.name && (
              <Text color="$red10" fontSize="$2">
                {errors.name}
              </Text>
            )}
          </YStack>

          {/* Email */}
          <YStack gap="$2">
            <Label htmlFor="email" fontSize="$4" fontWeight="600">
              Email
            </Label>
            <Input
              id="email"
              value={email}
              onChangeText={setEmail}
              placeholder="e.g., john@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              borderColor={errors.email ? '$red7' : '$borderColor'}
              disabled={loading}
            />
            {errors.email && (
              <Text color="$red10" fontSize="$2">
                {errors.email}
              </Text>
            )}
            <Text color="$gray11" fontSize="$2">
              Optional - useful for sending reminders (coming soon)
            </Text>
          </YStack>

          {/* Phone */}
          <YStack gap="$2">
            <Label htmlFor="phone" fontSize="$4" fontWeight="600">
              Phone
            </Label>
            <Input
              id="phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g., (555) 123-4567"
              keyboardType="phone-pad"
              borderColor={errors.phone ? '$red7' : '$borderColor'}
              disabled={loading}
            />
            {errors.phone && (
              <Text color="$red10" fontSize="$2">
                {errors.phone}
              </Text>
            )}
            <Text color="$gray11" fontSize="$2">
              Optional - useful for sending reminders (coming soon)
            </Text>
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
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Add Friend'}
            </Button>
          </XStack>
        </YStack>
      </ScrollView>
    </>
  )
}
