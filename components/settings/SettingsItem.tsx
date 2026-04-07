import { View, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Text } from '@/components/ui/text';

interface SettingsItemProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  isLast?: boolean;
  badge?: string;
}

export function SettingsItem({ icon, label, onPress, isLast = false, badge }: SettingsItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      className={`flex-row items-center justify-between px-5 py-4${!isLast ? ' border-b border-border/40' : ''}`}
    >
      <View className="flex-row items-center gap-4">
        <View className="w-10 h-10 bg-muted rounded-xl items-center justify-center">
          {icon}
        </View>
        <Text className="font-sans-medium text-foreground" style={{ fontSize: 15 }}>
          {label}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        {badge && (
          <View className="bg-secondary/15 px-2 py-1 rounded-lg">
            <Text className="font-sans-bold text-secondary" style={{ fontSize: 10 }}>
              {badge}
            </Text>
          </View>
        )}
        <ChevronRight size={18} color="#D1D5DB" />
      </View>
    </Pressable>
  );
}

export function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      className="font-sans-bold text-muted-foreground uppercase ml-1 mt-2 mb-1"
      style={{ fontSize: 11, letterSpacing: 0.8 }}
    >
      {title}
    </Text>
  );
}
