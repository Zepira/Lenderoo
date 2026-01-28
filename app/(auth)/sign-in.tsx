/**
 * Sign In Screen
 *
 * Allows users to sign in with email and password
 */

import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import * as toast from '@/lib/toast';
import { LogIn } from 'lucide-react-native';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
      toast.success('Welcome back!');
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center px-6 py-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-md mx-auto">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-4xl font-bold mb-2">Welcome back</Text>
            <Text className="text-muted-foreground text-base">
              Sign in to continue tracking your items
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4 mb-6">
            <View>
              <Label nativeID="email" className="mb-2">
                Email
              </Label>
              <Input
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!loading}
              />
            </View>

            <View>
              <Label nativeID="password" className="mb-2">
                Password
              </Label>
              <Input
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                editable={!loading}
              />
            </View>

            <Link href="/(auth)/forgot-password" asChild>
              <Button variant="link" className="self-end -mt-2" disabled={loading}>
                <Text>Forgot password?</Text>
              </Button>
            </Link>
          </View>

          {/* Sign In Button */}
          <Button
            onPress={handleSignIn}
            disabled={loading}
            className="mb-4"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <LogIn size={18} color="#fff" />
                <Text>Sign In</Text>
              </>
            )}
          </Button>

          {/* Sign Up Link */}
          <View className="flex-row justify-center items-center gap-1">
            <Text className="text-muted-foreground">Don't have an account?</Text>
            <Link href="/(auth)/sign-up" asChild>
              <Button variant="link" disabled={loading}>
                <Text>Sign Up</Text>
              </Button>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
