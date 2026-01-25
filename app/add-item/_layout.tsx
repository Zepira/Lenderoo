import { Stack } from "expo-router";

export default function AddItemLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="book" />
      <Stack.Screen name="generic" />
    </Stack>
  );
}
