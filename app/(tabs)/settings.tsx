import { YStack, XStack, Text, Button, ScrollView, Separator } from 'tamagui'
import { Moon, Sun, Info, Database, Download, Trash2 } from '@tamagui/lucide-icons'
import { useColorScheme } from 'react-native'
import { clearAllData, exportData, seedDemoData } from 'lib/database'
import { useState } from 'react'

export default function SettingsScreen() {
  const colorScheme = useColorScheme()
  const [exporting, setExporting] = useState(false)

  const handleExportData = async () => {
    try {
      setExporting(true)
      const data = await exportData()
      console.log('Exported data:', data)
      // TODO: Implement actual export functionality (save to file, share, etc.)
      alert(`Exported ${data.items.length} items, ${data.friends.length} friends`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const handleClearData = async () => {
    // TODO: Add confirmation dialog
    if (confirm('Are you sure you want to delete all data? This cannot be undone.')) {
      try {
        await clearAllData()
        alert('All data cleared')
      } catch (error) {
        console.error('Clear error:', error)
        alert('Failed to clear data')
      }
    }
  }

  const handleSeedDemo = async () => {
    try {
      await seedDemoData()
      alert('Demo data added')
    } catch (error) {
      console.error('Seed error:', error)
      alert('Failed to seed demo data')
    }
  }

  return (
    <ScrollView flex={1} bg="$background">
      <YStack p="$4" gap="$4">
        {/* App Info */}
        <YStack gap="$2">
          <Text fontSize="$6" fontWeight="600" color="$color">
            Lenderoo
          </Text>
          <Text fontSize="$3" color="$gray11">
            Version 1.0.0
          </Text>
          <Text fontSize="$3" color="$gray11">
            Never forget who borrowed your stuff!
          </Text>
        </YStack>

        <Separator />

        {/* Theme */}
        <YStack gap="$3">
          <Text fontSize="$5" fontWeight="600" color="$color">
            Appearance
          </Text>
          <XStack items="center" justify="space-between">
            <XStack items="center" gap="$2">
              {colorScheme === 'dark' ? (
                <Moon size={20} color="$gray11" />
              ) : (
                <Sun size={20} color="$gray11" />
              )}
              <Text fontSize="$4" color="$gray12">
                Theme
              </Text>
            </XStack>
            <Text fontSize="$4" color="$gray11" textTransform="capitalize">
              {colorScheme}
            </Text>
          </XStack>
        </YStack>

        <Separator />

        {/* Data Management */}
        <YStack gap="$3">
          <Text fontSize="$5" fontWeight="600" color="$color">
            Data
          </Text>

          <Button
            icon={Download}
            onPress={handleExportData}
            disabled={exporting}
            chromeless
            justify="flex-start"
          >
            Export Data
          </Button>

          <Button
            icon={Database}
            onPress={handleSeedDemo}
            chromeless
            justify="flex-start"
          >
            Add Demo Data
          </Button>

          <Button
            icon={Trash2}
            onPress={handleClearData}
            chromeless
            justify="flex-start"
            color="$red10"
          >
            Clear All Data
          </Button>
        </YStack>

        <Separator />

        {/* About */}
        <YStack gap="$3">
          <Text fontSize="$5" fontWeight="600" color="$color">
            About
          </Text>

          <XStack items="center" gap="$2">
            <Info size={20} color="$gray11" />
            <YStack gap="$1">
              <Text fontSize="$4" color="$gray12">
                Built with Expo Router & Tamagui
              </Text>
              <Text fontSize="$3" color="$gray11">
                Open source project for tracking borrowed items
              </Text>
            </YStack>
          </XStack>
        </YStack>

        {/* Footer */}
        <YStack mt="$6" items="center">
          <Text fontSize="$2" color="$gray10" ta="center">
            Made with ❤️ to help friends keep track of their stuff
          </Text>
        </YStack>
      </YStack>
    </ScrollView>
  )
}
