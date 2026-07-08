import { useState, useEffect } from "react";
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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  // Web only: token extracted from the URL hash without touching localStorage
  const [webAccessToken, setWebAccessToken] = useState<string | null>(null);
  const [linkInvalid, setLinkInvalid] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const hash = window.location.hash.slice(1);
    const params = Object.fromEntries(new URLSearchParams(hash));
    if (params.type === "recovery" && params.access_token) {
      setWebAccessToken(params.access_token);
      // Remove tokens from address bar — cosmetic, nothing persisted
      window.history.replaceState(null, "", window.location.pathname);
    } else {
      setLinkInvalid(true);
    }
  }, []);

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

      if (Platform.OS === "web") {
        if (!webAccessToken) {
          toast.error("Invalid or expired link. Request a new one.");
          return;
        }
        // Direct REST call — the recovery token never touches localStorage,
        // so no other browser tab is authenticated before the reset completes.
        const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${webAccessToken}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ password }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message || "Failed to update password");
        }
      } else {
        // Native: session was already established in _layout.tsx via deep link
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        // Clear the recovery session so the user re-authenticates normally
        await supabase.auth.signOut();
      }

      toast.success("Password updated! Please sign in.");
      router.replace("/(auth)/sign-in");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  }

  const fields = (
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
  );

  const submitButton = (
    <Button onPress={handleUpdate} disabled={loading || (Platform.OS === "web" && linkInvalid)}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Lock size={18} color="#fff" />
          <Text>Update password</Text>
        </>
      )}
    </Button>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      className="bg-background"
    >
      <SafeAreaWrapper>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: 32 }}>
            <View style={{ gap: 8 }}>
              <Text className="text-3xl font-bold">New password</Text>
              {linkInvalid ? (
                <Text className="text-destructive">
                  This link is invalid or has expired. Please request a new password reset.
                </Text>
              ) : (
                <Text className="text-muted-foreground">
                  Enter your new password below
                </Text>
              )}
            </View>

            {!linkInvalid && (
              Platform.OS === "web" ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}
                  style={{ display: "contents" }}
                >
                  {fields}
                  {submitButton}
                </form>
              ) : (
                <>
                  {fields}
                  {submitButton}
                </>
              )
            )}
          </View>
        </ScrollView>
      </SafeAreaWrapper>
    </KeyboardAvoidingView>
  );
}
