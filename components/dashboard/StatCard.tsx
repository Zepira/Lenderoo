import { View } from 'react-native';
import { StatDisplay, TinyLabel } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  unit: string;
  className?: string;
}

export function StatCard({ label, value, unit, className }: StatCardProps) {
  return (
    <View
      className={cn(
        'flex-1 bg-card rounded-3xl items-center border border-border',
        className,
      )}
      style={{
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <TinyLabel
        className="text-center mb-2"
        style={{ minHeight: 24 }}
        numberOfLines={2}
      >
        {label}
      </TinyLabel>
      <StatDisplay>{String(value)}</StatDisplay>
      <TinyLabel
        className="text-center mt-1"
        style={{ fontSize: 8, letterSpacing: 0.5 }}
        numberOfLines={1}
      >
        {unit}
      </TinyLabel>
    </View>
  );
}
