import { View, ScrollView } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { SectionHeading, BodyStrong } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { THEME } from '@/lib/theme';
import { ItemCard } from '@/components/ItemCard';
import { sortFavouritesFirst } from '@/lib/utils';
import type { BorrowRequest, Item } from 'lib/types';

interface DashboardSectionProps {
  title: string;
  items: Item[];
  onItemPress?: (item: Item) => void;
  onToggleFavourite?: (item: Item) => void;
  onViewAll?: () => void;
  /** The viewer's active borrow request for a given item, if any — only
   *  needed for sections that can contain not-yet-approved requests. */
  getRequest?: (item: Item) => BorrowRequest | undefined;
  /** Called after a card's own action (borrow/cancel/confirm/return) succeeds. */
  onChanged?: () => void;
  /** Lower sorts first. Takes priority over favourite-first ordering — used
   *  to surface items that need someone's action (e.g. a pending pickup or
   *  return) ahead of ones that don't. Favourites still break ties within
   *  the same priority. */
  getPriority?: (item: Item) => number;
}

export function DashboardSection({
  title,
  items,
  onItemPress,
  onToggleFavourite,
  onViewAll,
  getRequest,
  onChanged,
  getPriority,
}: DashboardSectionProps) {
  if (items.length === 0) return null;
  const favouritesFirst = sortFavouritesFirst(items);
  // Array.prototype.sort is stable, so sorting the already favourite-ordered
  // list by priority keeps favourites grouped first within each tier.
  const sortedItems = getPriority
    ? [...favouritesFirst].sort((a, b) => getPriority(a) - getPriority(b))
    : favouritesFirst;

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
            request={getRequest?.(item)}
            onPress={onItemPress ? () => onItemPress(item) : undefined}
            onToggleFavourite={
              onToggleFavourite ? () => onToggleFavourite(item) : undefined
            }
            onChanged={onChanged}
          />
        ))}
      </ScrollView>
    </View>
  );
}
