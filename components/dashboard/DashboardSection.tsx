import { View, ScrollView } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { SectionHeading, BodyStrong } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { THEME } from '@/lib/theme';
import { ItemCard } from '@/components/ItemCard';
import { sortFavouritesFirst } from '@/lib/utils';
import type { Item } from 'lib/types';

interface DashboardSectionProps {
  title: string;
  items: Item[];
  onItemPress?: (item: Item) => void;
  onToggleFavourite?: (item: Item) => void;
  onViewAll?: () => void;
}

export function DashboardSection({
  title,
  items,
  onItemPress,
  onToggleFavourite,
  onViewAll,
}: DashboardSectionProps) {
  if (items.length === 0) return null;
  const sortedItems = sortFavouritesFirst(items);

  return (
    <View>
      <View className="flex-row items-center justify-between mb-4">
        <SectionHeading>{title}</SectionHeading>
        {onViewAll && (
          <Button variant="link" size="sm" onPress={onViewAll} className="-mr-2">
            <BodyStrong className="text-primary" style={{ fontSize: 14, lineHeight: 20 }}>View All</BodyStrong>
            <ChevronRight size={15} color={THEME.light.primary} />
          </Button>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
      >
        {sortedItems.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onPress={() => onItemPress?.(item)}
            onToggleFavourite={
              onToggleFavourite ? () => onToggleFavourite(item) : undefined
            }
          />
        ))}
      </ScrollView>
    </View>
  );
}
