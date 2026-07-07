import { useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import * as toast from "@/lib/toast";
import { Lock } from "lucide-react-native";
import { SafeAreaWrapper } from "@/components/SafeAreaWrapper";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpdate() {
    if (!password || !confirm) {
      toast.error("Please fill in both fields");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated!");
      router.replace("/(tabs)");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <SafeAreaWrapper>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: 32 }}>
            <View style={{ gap: 8 }}>
              <Text className="text-3xl font-bold">New password</Text>
              <Text className="text-muted-foreground">
                Enter your new password below
              </Text>
            </View>

            <View style={{ gap: 16 }}>
              <View style={{ gap: 8 }}>
                <Label nativeID="password">New password</Label>
                <Input
                  nativeID="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType="newPassword"
                  editable={!loading}
                />
              </View>
              <View style={{ gap: 8 }}>
                <Label nativeID="confirm">Confirm password</Label>
                <Input
                  nativeID="confirm"
                  placeholder="Repeat password"
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType="newPassword"
                  editable={!loading}
                />
              </View>
            </View>

            <Button onPress={handleUpdate} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Lock size={18} color="#fff" />
                  <Text>Update password</Text>
                </>
              )}
            </Button>
          </View>
        </ScrollView>
      </SafeAreaWrapper>
    </KeyboardAvoidingView>
  );
}
