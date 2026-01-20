import { Link, Stack } from 'expo-router'
import { View } from 'react-native'
import { Text } from '@/components/ui/text'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View className="m-10">
        <Text variant="large">This screen doesn't exist.</Text>
        <Link href="/" className="mt-4 py-4">
          <Text className="text-blue-600">Go to home screen!</Text>
        </Link>
      </View>
    </>
  )
}
