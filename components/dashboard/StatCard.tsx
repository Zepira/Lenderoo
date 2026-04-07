import { View } from 'react-native';
import { Text } from '@/components/ui/text';
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
      <Text
        className="font-sans-bold text-muted-foreground text-center leading-tight mb-2"
        style={{ fontSize: 10, minHeight: 24 }}
        numberOfLines={2}
      >
        {label}
      </Text>
      <Text className="font-display-bold text-primary" style={{ fontSize: 24, lineHeight: 32 }}>
        {String(value)}
      </Text>
      <Text
        className="font-sans-bold text-muted-foreground uppercase text-center mt-1"
        style={{ fontSize: 8, letterSpacing: 0.5 }}
        numberOfLines={1}
      >
        {unit}
      </Text>
    </View>
  );
}
