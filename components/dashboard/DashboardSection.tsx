import { View, ScrollView } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { THEME } from '@/lib/theme';
import { DashboardItemCard } from './DashboardItemCard';
import type { Item } from 'lib/types';

interface DashboardSectionProps {
  title: string;
  items: Item[];
  type: 'borrowed' | 'lent';
  getPersonName: (item: Item) => string;
  onItemPress?: (item: Item) => void;
  onViewAll?: () => void;
}

export function DashboardSection({
  title,
  items,
  type,
  getPersonName,
  onItemPress,
  onViewAll,
}: DashboardSectionProps) {
  if (items.length === 0) return null;

  return (
    <View>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="font-display-bold text-foreground" style={{ fontSize: 20 }}>
          {title}
        </Text>
        {onViewAll && (
          <Button variant="link" size="sm" onPress={onViewAll} className="-mr-2">
            <Text className="font-sans-bold text-primary text-sm">View All</Text>
            <ChevronRight size={15} color={THEME.light.primary} />
          </Button>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 16, paddingBottom: 4 }}
      >
        {items.map((item) => (
          <DashboardItemCard
            key={item.id}
            item={item}
            personName={getPersonName(item)}
            type={type}
            onPress={() => onItemPress?.(item)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
