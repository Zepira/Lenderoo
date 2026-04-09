import { useState, useRef } from "react";
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, User, Mail, Lock, Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  PageTitle,
  TinyLabel,
  Caption,
} from "@/components/ui/typography";
import * as toast from "@/lib/toast";

export default function ProfileScreen() {
  const router = useRouter();
  const { appUser, user, updateProfile } = useAuth();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  // ── Personal info ─────────────────────────────────────────────────────────
  const [name, setName] = useState(appUser?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [savingInfo, setSavingInfo] = useState(false);

  // ── Password ──────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const submittingInfo = useRef(false);
  const submittingPassword = useRef(false);

  const inputStyle = {
    flex: 1,
    fontSize: 15,
    color: theme.foreground,
    fontFamily: "Inter-Medium",
    paddingVertical: 0,
  };

  const rowStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    backgroundColor: isDark ? theme.muted : "#F3F4F6",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  };

  // ── Save personal info ────────────────────────────────────────────────────
  const handleSaveInfo = async () => {
    if (submittingInfo.current || savingInfo) return;
    submittingInfo.current = true;
    setSavingInfo(true);

    try {
      const nameChanged = name.trim() !== (appUser?.name ?? "");
      const emailChanged = email.trim() !== (user?.email ?? "");

      if (!nameChanged && !emailChanged) {
        toast.error("No changes to save");
        return;
      }

      if (nameChanged) {
        await updateProfile({ name: name.trim() });
      }

      if (emailChanged) {
        const { error } = await supabase.auth.updateUser({
          email: email.trim(),
        });
        if (error) throw error;
        toast.success("Confirmation email sent — check your inbox");
        return;
      }

      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update profile");
    } finally {
      setSavingInfo(false);
      submittingInfo.current = false;
    }
  };

  // ── Save password ─────────────────────────────────────────────────────────
  const handleSavePassword = async () => {
    if (submittingPassword.current || savingPassword) return;

    if (!currentPassword) {
      toast.error("Enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    submittingPassword.current = true;
    setSavingPassword(true);

    try {
      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email ?? "",
        password: currentPassword,
      });
      if (signInError) throw new Error("Current password is incorrect");

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update password");
    } finally {
      setSavingPassword(false);
      submittingPassword.current = false;
    }
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: theme.card,
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 4,
          marginBottom: 24,
        }}
      >
        <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: isDark ? theme.muted : "#F3F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <ArrowLeft size={22} color={theme.mutedForeground} />
              </Pressable>
              <PageTitle>Edit Profile</PageTitle>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48, gap: 16 }}
      >
        {/* ── Personal info card ── */}
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 32,
            padding: 24,
            borderWidth: 1,
            borderColor: theme.border,
            gap: 16,
          }}
        >
          <TinyLabel>Personal Info</TinyLabel>

          {/* Display name */}
          <View style={{ gap: 8 }}>
            <TinyLabel style={{ color: theme.mutedForeground }}>Display Name</TinyLabel>
            <View style={rowStyle}>
              <User size={18} color={theme.mutedForeground} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={theme.mutedForeground}
                autoCorrect={false}
                style={inputStyle}
              />
            </View>
          </View>

          {/* Email */}
          <View style={{ gap: 8 }}>
            <TinyLabel style={{ color: theme.mutedForeground }}>Email</TinyLabel>
            <View style={rowStyle}>
              <Mail size={18} color={theme.mutedForeground} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={theme.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={inputStyle}
              />
            </View>
            <Caption style={{ color: theme.mutedForeground }}>
              Changing your email will send a confirmation link to the new address.
            </Caption>
          </View>

          <Button onPress={handleSaveInfo} disabled={savingInfo}>
            {savingInfo && <ActivityIndicator size="small" color="white" />}
            <Text className="text-primary-foreground font-bold">
              {savingInfo ? "Saving…" : "Save Changes"}
            </Text>
          </Button>
        </View>

        {/* ── Change password card ── */}
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 32,
            padding: 24,
            borderWidth: 1,
            borderColor: theme.border,
            gap: 16,
          }}
        >
          <TinyLabel>Change Password</TinyLabel>

          {/* Current password */}
          <View style={{ gap: 8 }}>
            <TinyLabel style={{ color: theme.mutedForeground }}>Current Password</TinyLabel>
            <View style={rowStyle}>
              <Lock size={18} color={theme.mutedForeground} />
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={theme.mutedForeground}
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
                autoCorrect={false}
                style={inputStyle}
              />
              <Pressable onPress={() => setShowCurrent(v => !v)} hitSlop={8}>
                {showCurrent
                  ? <EyeOff size={18} color={theme.mutedForeground} />
                  : <Eye size={18} color={theme.mutedForeground} />}
              </Pressable>
            </View>
          </View>

          {/* New password */}
          <View style={{ gap: 8 }}>
            <TinyLabel style={{ color: theme.mutedForeground }}>New Password</TinyLabel>
            <View style={rowStyle}>
              <Lock size={18} color={theme.mutedForeground} />
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Min. 8 characters"
                placeholderTextColor={theme.mutedForeground}
                secureTextEntry={!showNew}
                autoCapitalize="none"
                autoCorrect={false}
                style={inputStyle}
              />
              <Pressable onPress={() => setShowNew(v => !v)} hitSlop={8}>
                {showNew
                  ? <EyeOff size={18} color={theme.mutedForeground} />
                  : <Eye size={18} color={theme.mutedForeground} />}
              </Pressable>
            </View>
          </View>

          {/* Confirm password */}
          <View style={{ gap: 8 }}>
            <TinyLabel style={{ color: theme.mutedForeground }}>Confirm New Password</TinyLabel>
            <View style={rowStyle}>
              <Lock size={18} color={theme.mutedForeground} />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat new password"
                placeholderTextColor={theme.mutedForeground}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                style={inputStyle}
              />
              <Pressable onPress={() => setShowConfirm(v => !v)} hitSlop={8}>
                {showConfirm
                  ? <EyeOff size={18} color={theme.mutedForeground} />
                  : <Eye size={18} color={theme.mutedForeground} />}
              </Pressable>
            </View>
          </View>

          <Button onPress={handleSavePassword} disabled={savingPassword}>
            {savingPassword && <ActivityIndicator size="small" color="white" />}
            <Text className="text-primary-foreground font-bold">
              {savingPassword ? "Updating…" : "Update Password"}
            </Text>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
