/**
 * Auth Stack Layout
 *
 * Stack navigator for authentication screens (sign in, sign up, forgot password)
 */

import { Stack } from 'expo-router';
import { useThemeContext } from '../../contexts/ThemeContext';

export default function AuthLayout() {
  const { activeTheme } = useThemeContext();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: activeTheme === 'dark' ? '#000' : '#fff',
        },
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
