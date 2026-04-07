import { View, Image, Pressable } from 'react-native';
import {
  Clock,
  CheckCircle2,
  BookOpen,
  Wrench,
  Shirt,
  Smartphone,
  Gamepad2,
  Trophy,
  UtensilsCrossed,
  Package,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { THEME } from '@/lib/theme';
import type { Item, ItemCategory } from 'lib/types';

const CARD_WIDTH = 128;

const CATEGORY_CONFIG: Record<
  ItemCategory,
  { color: string; icon: React.ComponentType<{ size: number; color: string }> }
> = {
  book: { color: THEME.light.primary, icon: BookOpen },
  tool: { color: '#F59E0B', icon: Wrench },
  clothing: { color: THEME.light.secondary, icon: Shirt },
  electronics: { color: '#8B5CF6', icon: Smartphone },
  game: { color: THEME.light.destructive, icon: Gamepad2 },
  sports: { color: '#10B981', icon: Trophy },
  kitchen: { color: '#F97316', icon: UtensilsCrossed },
  other: { color: '#6B7280', icon: Package },
};

interface DashboardItemCardProps {
  item: Item;
  personName: string;
  type: 'borrowed' | 'lent';
  onPress?: () => void;
}

export function DashboardItemCard({ item, personName, type, onPress }: DashboardItemCardProps) {
  const imageUrl = item.images?.[0] ?? item.imageUrl;
  const config = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.other;
  const CategoryIcon = config.icon;

  return (
    <Pressable onPress={onPress} style={{ width: CARD_WIDTH }}>
      {/* Image / placeholder */}
      <View
        style={{
          width: CARD_WIDTH,
          aspectRatio: 3 / 4,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: config.color + '18',
          marginBottom: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 3,
        }}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <CategoryIcon size={40} color={config.color} />
          </View>
        )}

        {/* Status badge */}
        <View
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(255,255,255,0.92)',
            padding: 6,
            borderRadius: 8,
          }}
        >
          {type === 'borrowed' ? (
            <Clock size={12} color={THEME.light.primary} />
          ) : (
            <CheckCircle2 size={12} color={THEME.light.primary} />
          )}
        </View>
      </View>

      <Text
        className="text-xs font-sans-bold text-foreground"
        numberOfLines={1}
      >
        {item.name}
      </Text>
      <Text
        className="font-sans-medium text-muted-foreground"
        style={{ fontSize: 10 }}
        numberOfLines={1}
      >
        {type === 'borrowed' ? `From: ${personName}` : `To: ${personName}`}
      </Text>
    </Pressable>
  );
}
