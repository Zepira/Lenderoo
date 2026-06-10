import { useState } from "react";
import {
  View,
  ScrollView,
  Image,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  User,
  Lock,
  Users,
  Bell,
  CreditCard,
  Heart,
  LogOut,
  Camera,
  Sun,
  Moon,
  Monitor,
} from "lucide-react-native";
import { Text } from "@/components/ui/text";
import {
  PageTitle,
  SectionHeading,
  BodyStrong,
  Caption,
} from "@/components/ui/typography";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import {
  SettingsItem,
  SectionHeader,
} from "@/components/settings/SettingsItem";
import * as toast from "@/lib/toast";
import { AvatarPickerModal } from "@/components/AvatarPickerModal";
import { resolveAvatarSource, uploadAvatarImage } from "@/lib/services/avatar";

const confirmAsync = (title: string, message: string): Promise<boolean> => {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "OK", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
};

export default function SettingsScreen() {
  const { appUser, user, signOut, updateProfile } = useAuth();
  const { themeMode, setThemeMode, activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;
  const [signingOut, setSigningOut] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  const firstName = appUser?.name?.split(" ")[0] ?? "";
  const lastName = appUser?.name?.split(" ").slice(1).join(" ") ?? "";
  const displayName = lastName
    ? `${firstName} ${lastName[0]}.`
    : (appUser?.name ?? "Profile");

  const handleSignOut = async () => {
    const confirmed = await confirmAsync(
      "Sign Out",
      "Are you sure you want to sign out?",
    );
    if (!confirmed) return;
    try {
      setSigningOut(true);
      await signOut();
    } catch (error: any) {
      toast.error(error?.message || "Failed to sign out");
    } finally {
      setSigningOut(false);
    }
  };

  const handleSelectPreset = async (presetUrl: string) => {
    try {
      setUpdatingAvatar(true);
      await updateProfile({ avatarUrl: presetUrl });
      setAvatarModalVisible(false);
      toast.success("Avatar updated");
    } catch {
      toast.error("Failed to update avatar");
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const handleSelectImage = async (uri: string) => {
    if (!user) return;
    try {
      setUpdatingAvatar(true);
      const url = await uploadAvatarImage(user.id, uri);
      await updateProfile({ avatarUrl: url });
      setAvatarModalVisible(false);
      toast.success("Avatar updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to upload photo");
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const THEME_OPTIONS = [
    { mode: "light" as const, icon: Sun, label: "Light" },
    { mode: "dark" as const, icon: Moon, label: "Dark" },
    { mode: "system" as const, icon: Monitor, label: "System" },
  ];

  return (
    <View
      style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {/* Header card */}
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
          <SafeAreaView
            edges={["top"]}
            style={{ backgroundColor: "transparent" }}
          >
            <View
              style={{
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: 32,
              }}
            >
              <PageTitle className="mb-8">Settings</PageTitle>

              {/* Profile */}
              <View style={{ alignItems: "center" }}>
                <View style={{ position: "relative", marginBottom: 16 }}>
                  <View
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 32,
                      overflow: "hidden",
                      borderWidth: 3,
                      borderColor: THEME.light.primary + "33",
                      backgroundColor: theme.muted,
                    }}
                  >
                    {(() => {
                      const src = resolveAvatarSource(appUser?.avatarUrl);
                      return src ? (
                        <Image
                          source={src}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            flex: 1,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: THEME.light.primary + "22",
                          }}
                        >
                          <BodyStrong
                            className="text-primary"
                            style={{ fontSize: 32, lineHeight: 42 }}
                          >
                            {(appUser?.name?.[0] ?? "?").toUpperCase()}
                          </BodyStrong>
                        </View>
                      );
                    })()}
                  </View>

                  {/* Camera button */}
                  <Pressable
                    onPress={() => setAvatarModalVisible(true)}
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: -4,
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: THEME.light.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: theme.card,
                      elevation: 4,
                      shadowColor: THEME.light.primary,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.4,
                      shadowRadius: 4,
                    }}
                  >
                    {updatingAvatar ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Camera size={15} color="white" />
                    )}
                  </Pressable>
                </View>

                <SectionHeading>{displayName}</SectionHeading>
                <Caption style={{ marginTop: 2 }}>{appUser?.email}</Caption>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <View style={{ paddingHorizontal: 24, gap: 8 }}>
          {/* Account */}
          <SectionHeader title="Account" />
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 24,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <SettingsItem
              icon={<Users size={20} color={THEME.light.primary} />}
              label="My Friends"
              onPress={() => router.push("/(tabs)/friends" as any)}
              isLast
            />
            <SettingsItem
              icon={<User size={20} color={THEME.light.primary} />}
              label="Profile"
              onPress={() => router.push("/profile" as any)}
            />
          </View>

          {/* Preferences */}
          <SectionHeader title="Preferences" />
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 24,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <SettingsItem
              icon={<Bell size={20} color={THEME.light.secondary} />}
              label="Notifications"
              badge={{ text: "Coming Soon", color: THEME.light.secondary }}
              onPress={() => {}}
            />
            <SettingsItem
              icon={<CreditCard size={20} color={THEME.light.secondary} />}
              label="Subscription"
              badge={{ text: "Coming Soon", color: THEME.light.secondary }}
              onPress={() => {}}
              isLast
            />
          </View>

          {/* Appearance — always-visible theme picker */}
          {/* <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 24,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View className="w-10 h-10 bg-muted rounded-xl items-center justify-center">
                {themeMode === "dark"
                  ? <Moon size={20} color={THEME.light.secondary} />
                  : themeMode === "light"
                  ? <Sun size={20} color={THEME.light.secondary} />
                  : <Monitor size={20} color={THEME.light.secondary} />}
              </View>
              <Text className="font-sans-medium text-foreground" style={{ fontSize: 15 }}>
                Appearance
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {THEME_OPTIONS.map(({ mode, icon: Icon, label }) => {
                const active = themeMode === mode;
                return (
                  <Pressable
                    key={mode}
                    onPress={() => setThemeMode(mode)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 14,
                      alignItems: "center",
                      backgroundColor: active ? THEME.light.primary : theme.muted,
                      gap: 4,
                    }}
                  >
                    <Icon size={16} color={active ? "white" : theme.mutedForeground} />
                    <Text
                      className="font-sans-bold"
                      style={{ fontSize: 11, color: active ? "white" : theme.mutedForeground }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View> */}

          {/* Support */}
          <SectionHeader title="Support" />
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 24,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <SettingsItem
              icon={<Heart size={20} color={THEME.light.primary} />}
              label="Help Center"
              badge={{ text: "Coming Soon", color: THEME.light.primary }}
              onPress={() => {}}
            />
            <SettingsItem
              icon={<LogOut size={20} color={THEME.light.destructive} />}
              label={signingOut ? "Signing out…" : "Sign Out"}
              onPress={handleSignOut}
              isLast
            />
          </View>
        </View>
      </ScrollView>

      <AvatarPickerModal
        visible={avatarModalVisible}
        onClose={() => !updatingAvatar && setAvatarModalVisible(false)}
        onSelectPreset={handleSelectPreset}
        onSelectImage={handleSelectImage}
        uploading={updatingAvatar}
      />
    </View>
  );
}
