import { router, Stack } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BookX } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-8">
          {/* Icon */}
          <View className="mb-6 h-24 w-24 items-center justify-center rounded-3xl bg-primary/10">
            <BookX size={48} color="#00BFA6" strokeWidth={1.5} />
          </View>

          {/* 404 */}
          <Text
            className="font-display-bold text-primary mb-2"
            style={{ fontSize: 80, lineHeight: 88 }}
          >
            Oops!
          </Text>

          {/* Title */}
          <Text variant="h2" className="text-foreground mb-3 text-center">
            Page not found
          </Text>

          {/* Subtitle */}
          <Text className="text-muted-foreground text-base text-center mb-10 max-w-xs">
            This page has wandered off. It might have been moved, deleted, or
            never existed.
          </Text>

          {/* CTA */}
          <Button
            onPress={() => router.replace("/")}
            className="w-full max-w-xs"
          >
            <Text>Back to home</Text>
          </Button>
        </View>
      </SafeAreaView>
    </>
  );
}
