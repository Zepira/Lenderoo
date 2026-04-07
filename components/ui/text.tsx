import { cn } from '@/lib/utils';
import * as Slot from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Text as RNText, type Role, type StyleProp, type TextStyle } from 'react-native';

// Typography system — Lenderoo design spec.
// Font families are applied via inline style (not className) because NativeWind's
// custom fontFamily class transformation is unreliable on native builds.
const textVariants = cva(
  cn('text-foreground text-base', Platform.select({ web: 'select-text' })),
  {
    variants: {
      variant: {
        // Body — Inter Regular 16px
        default: '',
        // H1 — Outfit Bold 48px tight (splash/logo)
        h1: cn(
          'text-5xl tracking-tight',
          Platform.select({ web: 'scroll-m-20 text-balance' })
        ),
        // H2 — Outfit Bold 30px (screen titles)
        h2: cn('text-[30px]', Platform.select({ web: 'scroll-m-20' })),
        // H3 — Outfit Bold 20px (section titles)
        h3: cn('text-xl', Platform.select({ web: 'scroll-m-20' })),
        // H4 — Outfit Bold 18px
        h4: cn('text-lg', Platform.select({ web: 'scroll-m-20' })),
        // Paragraph
        p: 'leading-7',
        // Lead — Inter Medium, larger muted
        lead: 'text-xl text-muted-foreground',
        // Large — Inter Bold
        large: 'text-lg',
        // Small label — Inter ExtraBold 10px, uppercase, wide tracking
        small: 'text-[10px] uppercase tracking-widest text-muted-foreground',
        // Muted
        muted: 'text-sm text-muted-foreground',
        // Stat value — Outfit Bold 24px
        stat: 'text-2xl',
        // Button label — Inter Bold 16px
        button: 'text-base',
        // Blockquote
        blockquote: cn(
          'mt-4 border-l-2 pl-3 italic text-muted-foreground',
          Platform.select({ web: 'sm:mt-6 sm:pl-6' })
        ),
        // Code
        code: 'bg-muted rounded px-1 py-0.5 text-sm font-mono',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

type TextVariantProps = VariantProps<typeof textVariants>;
type TextVariant = NonNullable<TextVariantProps['variant']>;

// Font family applied via inline style — reliable on all React Native targets.
const FONT_STYLE: Partial<Record<TextVariant, TextStyle>> = {
  h1:    { fontFamily: 'Outfit-Bold' },
  h2:    { fontFamily: 'Outfit-Bold' },
  h3:    { fontFamily: 'Outfit-Bold' },
  h4:    { fontFamily: 'Outfit-Bold' },
  stat:  { fontFamily: 'Outfit-Bold' },
  lead:  { fontFamily: 'Inter-Medium' },
  large: { fontFamily: 'Inter-Bold' },
  small: { fontFamily: 'Inter-ExtraBold' },
  button:{ fontFamily: 'Inter-Bold' },
};

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading',
  blockquote: Platform.select({ web: 'blockquote' as Role }),
  code: Platform.select({ web: 'code' as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: '1', h2: '2', h3: '3', h4: '4',
};

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
  className,
  asChild = false,
  variant = 'default',
  style,
  ...props
}: React.ComponentProps<typeof RNText> &
  TextVariantProps &
  React.RefAttributes<RNText> & {
    asChild?: boolean;
  }) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot.Text : RNText;

  const fontStyle = variant ? FONT_STYLE[variant] : undefined;

  return (
    <Component
      className={cn(textVariants({ variant }), textClass, className)}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      style={[fontStyle, style] as StyleProp<TextStyle>}
      {...props}
    />
  );
}

export { Text, TextClassContext };
