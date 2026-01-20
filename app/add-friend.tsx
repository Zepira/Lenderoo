import { useState } from 'react'
import { View, ScrollView, Pressable } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useCreateFriend } from 'hooks'
import { createFriendSchema } from 'lib/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

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
            <Pressable onPress={handleCancel} disabled={loading}>
              <Text className="text-blue-600">Cancel</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView className="flex-1 bg-background">
        <View className="p-4 gap-4">
          {errors.general && (
            <View className="p-3 bg-red-50 rounded-lg border border-red-200">
              <Text variant="small" className="text-red-600">
                {errors.general}
              </Text>
            </View>
          )}

          {/* Name */}
          <View className="gap-2">
            <Text variant="small" className="font-semibold">
              Name *
            </Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="e.g., John Doe"
              className={cn(errors.name && "border-red-500")}
              editable={!loading}
              autoFocus
            />
            {errors.name && (
              <Text variant="muted" className="text-red-600">
                {errors.name}
              </Text>
            )}
          </View>

          {/* Email */}
          <View className="gap-2">
            <Text variant="small" className="font-semibold">
              Email
            </Text>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="e.g., john@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              className={cn(errors.email && "border-red-500")}
              editable={!loading}
            />
            {errors.email && (
              <Text variant="muted" className="text-red-600">
                {errors.email}
              </Text>
            )}
            <Text variant="muted">
              Optional - useful for sending reminders (coming soon)
            </Text>
          </View>

          {/* Phone */}
          <View className="gap-2">
            <Text variant="small" className="font-semibold">
              Phone
            </Text>
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g., (555) 123-4567"
              keyboardType="phone-pad"
              className={cn(errors.phone && "border-red-500")}
              editable={!loading}
            />
            {errors.phone && (
              <Text variant="muted" className="text-red-600">
                {errors.phone}
              </Text>
            )}
            <Text variant="muted">
              Optional - useful for sending reminders (coming soon)
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onPress={handleCancel}
              disabled={loading}
            >
              <Text>Cancel</Text>
            </Button>
            <Button
              className="flex-1 bg-blue-600"
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text className="text-white">{loading ? 'Saving...' : 'Add Friend'}</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </>
  )
}
