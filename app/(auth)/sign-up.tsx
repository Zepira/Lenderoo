/**
 * Sign Up Screen
 *
 * Allows new users to create an account with email and password
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
import { UserPlus } from 'lucide-react-native';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    // Validation
    if (!name || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await signUp(email, password, name);
      toast.success('Account created! Please check your email to verify your account.');
      router.replace('/(auth)/sign-in');
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Failed to create account. Please try again.');
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
            <Text className="text-4xl font-bold mb-2">Create account</Text>
            <Text className="text-muted-foreground text-base">
              Sign up to start tracking your items
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4 mb-6">
            <View>
              <Label nativeID="name" className="mb-2">
                Name
              </Label>
              <Input
                placeholder="Your name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                editable={!loading}
              />
            </View>

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
                autoComplete="password-new"
                textContentType="newPassword"
                editable={!loading}
              />
              <Text className="text-muted-foreground text-xs mt-1">
                Must be at least 6 characters
              </Text>
            </View>

            <View>
              <Label nativeID="confirmPassword" className="mb-2">
                Confirm Password
              </Label>
              <Input
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password-new"
                textContentType="newPassword"
                editable={!loading}
              />
            </View>
          </View>

          {/* Sign Up Button */}
          <Button
            onPress={handleSignUp}
            disabled={loading}
            className="mb-4"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <UserPlus size={18} color="#fff" />
                <Text>Sign Up</Text>
              </>
            )}
          </Button>

          {/* Sign In Link */}
          <View className="flex-row justify-center items-center gap-1">
            <Text className="text-muted-foreground">Already have an account?</Text>
            <Link href="/(auth)/sign-in" asChild>
              <Button variant="link" disabled={loading}>
                <Text>Sign In</Text>
              </Button>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
