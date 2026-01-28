/**
 * Forgot Password Screen
 *
 * Allows users to request a password reset email
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
import { Mail, ArrowLeft } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleResetPassword() {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email);
      setEmailSent(true);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <View className="flex-1 bg-background justify-center px-6">
        <View className="w-full max-w-md mx-auto items-center">
          <View className="bg-primary/10 w-16 h-16 rounded-full items-center justify-center mb-6">
            <Mail size={32} className="text-primary" />
          </View>
          <Text className="text-2xl font-bold mb-3 text-center">Check your email</Text>
          <Text className="text-muted-foreground text-base text-center mb-8">
            We've sent password reset instructions to{'\n'}
            <Text className="font-semibold">{email}</Text>
          </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Button className="w-full">
              <ArrowLeft size={18} color="#fff" />
              <Text>Back to Sign In</Text>
            </Button>
          </Link>
        </View>
      </View>
    );
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
            <Text className="text-4xl font-bold mb-2">Reset password</Text>
            <Text className="text-muted-foreground text-base">
              Enter your email and we'll send you instructions to reset your password
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
          </View>

          {/* Reset Button */}
          <Button
            onPress={handleResetPassword}
            disabled={loading}
            className="mb-4"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Mail size={18} color="#fff" />
                <Text>Send Reset Link</Text>
              </>
            )}
          </Button>

          {/* Back to Sign In */}
          <Link href="/(auth)/sign-in" asChild>
            <Button variant="link" disabled={loading} className="self-center">
              <ArrowLeft size={16} />
              <Text>Back to Sign In</Text>
            </Button>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
