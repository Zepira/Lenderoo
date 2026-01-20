import { Pressable } from 'react-native'
import { Moon, Sun } from 'lucide-react-native'
import { useThemeContext } from '../contexts/ThemeContext'

export function ThemeSwitcher() {
  const { themeMode, setThemeMode } = useThemeContext()

  const toggleTheme = () => {
    // Toggle between light and dark (skip system for quick toggle)
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark')
  }

  return (
    <Pressable
      onPress={toggleTheme}
      className="p-2"
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {themeMode === 'dark' ? (
        <Sun size={24} color="#f59e0b" />
      ) : (
        <Moon size={24} color="#3b82f6" />
      )}
    </Pressable>
  )
}
