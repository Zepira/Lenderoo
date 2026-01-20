import { View, ScrollView, Alert } from "react-native";
import {
  Moon,
  Sun,
  Monitor,
  Info,
  Database,
  Download,
  Trash2,
} from "lucide-react-native";
import { clearAllData, exportData, seedDemoData } from "lib/database";
import { useState } from "react";
import { useThemeContext } from "contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export default function SettingsScreen() {
  const { themeMode, setThemeMode } = useThemeContext();
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    try {
      setExporting(true);
      const data = await exportData();
      console.log("Exported data:", data);
      // TODO: Implement actual export functionality (save to file, share, etc.)
      Alert.alert(
        "Data Exported",
        `Exported ${data.items.length} items, ${data.friends.length} friends`
      );
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Error", "Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handleClearData = async () => {
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to delete all data? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllData();
              Alert.alert("Success", "All data cleared");
            } catch (error) {
              console.error("Clear error:", error);
              Alert.alert("Error", "Failed to clear data");
            }
          },
        },
      ]
    );
  };

  const handleSeedDemo = async () => {
    try {
      await seedDemoData();
      Alert.alert("Success", "Demo data added");
    } catch (error) {
      console.error("Seed error:", error);
      Alert.alert("Error", "Failed to seed demo data");
    }
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-4 gap-4">
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
              <Sun size={16} />
              <Text className={themeMode === "light" ? "text-white" : ""}>
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
            <Download size={20} />
            <Text>Export Data</Text>
          </Button>

          <Button
            variant="ghost"
            className="justify-start"
            onPress={handleSeedDemo}
          >
            <Database size={20} />
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
      </View>
    </ScrollView>
  );
}
