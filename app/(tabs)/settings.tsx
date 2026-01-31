import { View, ScrollView, Alert, Platform } from "react-native";
import {
  Moon,
  Sun,
  Monitor,
  Info,
  Database,
  Download,
  Trash2,
  LogOut,
  User,
} from "lucide-react-native";
import { clearAllData, exportData, seedDemoData } from "lib/database";
import { useState } from "react";
import { useThemeContext } from "contexts/ThemeContext";
import { useAuth } from "contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { THEME } from "@/lib/theme";
import { DarkTheme } from "@react-navigation/native";
import { SafeAreaWrapper } from "@/components/SafeAreaWrapper";
import { router } from "expo-router";
import * as toast from "@/lib/toast";

// Cross-platform confirm dialog
const confirmAsync = (title: string, message: string): Promise<boolean> => {
  if (Platform.OS === 'web') {
    // Use browser confirm on web
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  // Use React Native Alert on native
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "OK", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
};

export default function SettingsScreen() {
  const { themeMode, setThemeMode, activeTheme } = useThemeContext();
  const { appUser, signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const isDark = activeTheme === "dark";

  const handleExportData = async () => {
    try {
      setExporting(true);
      const data = await exportData();
      console.log("Exported data:", data);
      // TODO: Implement actual export functionality (save to file, share, etc.)
      toast.success(
        `Data exported: ${data.items.length} items, ${data.friends.length} friends`
      );
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handleClearData = async () => {
    const confirmed = await confirmAsync(
      "Clear All Data",
      "Are you sure you want to delete all data? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      await clearAllData();
      toast.success("All data cleared");
    } catch (error) {
      console.error("Clear error:", error);
      toast.error("Failed to clear data");
    }
  };

  const handleSeedDemo = async () => {
    try {
      await seedDemoData();
      toast.success("Demo data added");
    } catch (error) {
      console.error("Seed error:", error);
      toast.error("Failed to seed demo data");
    }
  };

  const handleSignOut = async () => {
    console.log("Signing out...");
    const confirmed = await confirmAsync(
      "Sign Out",
      "Are you sure you want to sign out?"
    );

    if (!confirmed) {
      console.log("Sign out cancelled");
      return;
    }

    try {
      setSigningOut(true);
      await signOut();
      toast.success("Signed out successfully");
      // Auth state change will automatically trigger navigation to sign-in
      // via the useEffect in _layout.tsx
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast.error(error?.message || "Failed to sign out");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <SafeAreaWrapper>
        {/* App Info */}
        <View className="gap-2">
          <Text variant="h3">Lenderoo</Text>
          <Text variant="small" className="text-muted-foreground">
            Version 1.0.0
          </Text>
          <Text variant="small" className="text-muted-foreground">
            Never forget who borrowed your stuff!
          </Text>
        </View>

        <View className="h-px bg-border" />

        {/* Profile */}
        <View className="gap-3">
          <Text variant="h4">Profile</Text>
          {appUser && (
            <View className="gap-2">
              <View className="flex-row items-center gap-3">
                <View className="bg-primary/10 w-12 h-12 rounded-full items-center justify-center">
                  <User
                    size={24}
                    color={THEME[isDark ? "dark" : "light"].primary}
                  />
                </View>
                <View className="flex-1">
                  <Text variant="base" className="font-semibold">
                    {appUser.name}
                  </Text>
                  <Text variant="small" className="text-muted-foreground">
                    {appUser.email}
                  </Text>
                </View>
              </View>
              <Button
                variant="outline"
                className="justify-start"
                onPress={handleSignOut}
                disabled={signingOut}
              >
                <LogOut size={20} color={isDark ? "#888" : "black"} />
                <Text>Sign Out</Text>
              </Button>
            </View>
          )}
        </View>

        <View className="h-px bg-border" />

        {/* Theme */}
        <View className="gap-3">
          <Text variant="h4">Appearance</Text>
          <Text variant="small" className="text-muted-foreground">
            Choose your preferred theme
          </Text>
          <View className="flex-row gap-2">
            <Button
              variant={themeMode === "light" ? "default" : "outline"}
              className={cn("flex-1", themeMode === "light" && "bg-blue-600")}
              onPress={() => setThemeMode("light")}
            >
              <Sun
                size={16}
                color={isDark ? THEME.dark.primary : THEME.light.primary}
              />
              <Text className={themeMode === "dark" ? "text-white" : ""}>
                Light
              </Text>
            </Button>
            <Button
              variant={themeMode === "dark" ? "default" : "outline"}
              className={cn("flex-1", themeMode === "dark" && "bg-blue-600")}
              onPress={() => setThemeMode("dark")}
            >
              <Moon size={16} />
              <Text className={themeMode === "dark" ? "text-white" : ""}>
                Dark
              </Text>
            </Button>
            <Button
              variant={themeMode === "system" ? "default" : "outline"}
              className={cn("flex-1", themeMode === "system" && "bg-blue-600")}
              onPress={() => setThemeMode("system")}
            >
              <Monitor size={16} />
              <Text className={themeMode === "system" ? "text-white" : ""}>
                System
              </Text>
            </Button>
          </View>
        </View>

        <View className="h-px bg-border" />

        {/* Data Management */}
        <View className="gap-3">
          <Text variant="h4">Data</Text>

          <Button
            variant="ghost"
            className="justify-start"
            onPress={handleExportData}
            disabled={exporting}
          >
            <Download
              size={20}
              color={themeMode === "dark" ? "#888" : "black"}
            />
            <Text>Export Data</Text>
          </Button>

          <Button
            variant="ghost"
            className="justify-start"
            onPress={handleSeedDemo}
          >
            <Database
              size={20}
              color={themeMode === "dark" ? "#888" : "black"}
            />
            <Text>Add Demo Data</Text>
          </Button>

          <Button
            variant="ghost"
            className="justify-start"
            onPress={handleClearData}
          >
            <Trash2 size={20} color="#ef4444" />
            <Text className="text-red-600">Clear All Data</Text>
          </Button>
        </View>

        <View className="h-px bg-border" />

        {/* About */}
        <View className="gap-3">
          <Text variant="h4">About</Text>

          <View className="flex-row items-center gap-2">
            <Info size={20} color="#888" />
            <View className="gap-1 flex-1">
              <Text variant="small">Built with Expo Router & shadcn/ui</Text>
              <Text variant="muted">
                Open source project for tracking borrowed items
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="mt-6 items-center">
          <Text variant="muted" className="text-center">
            Made with ❤️ to help friends keep track of their stuff
          </Text>
        </View>
      </SafeAreaWrapper>
    </ScrollView>
  );
}
