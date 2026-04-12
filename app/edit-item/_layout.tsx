import { Stack } from "expo-router";

export default function EditItemLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="generic" />
      <Stack.Screen name="book" />
    </Stack>
  );
}
