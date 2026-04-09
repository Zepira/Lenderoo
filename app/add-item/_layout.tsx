import { Stack } from "expo-router";

export default function AddItemLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="search" />
      <Stack.Screen name="book" />
      <Stack.Screen name="generic" />
    </Stack>
  );
}
