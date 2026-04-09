/**
 * Lenderoo Typography Components
 *
 * Named semantic wrappers around <Text> that encode the correct font family,
 * size, and — critically — lineHeight for every type-scale step.
 *
 * Outfit Bold (display) clips on both iOS and Android without an explicit
 * lineHeight because the font's vertical metrics sit outside the default
 * line-box. All DisplayXxx components set lineHeight = fontSize × 1.33.
 *
 * Override colour/margin/etc. via className or style as usual.
 */

import * as React from "react";
import type { StyleProp, TextStyle } from "react-native";
import { cn } from "@/lib/utils";
import { Text } from "./text";

type TextProps = React.ComponentProps<typeof Text>;

// ── Outfit Bold — Display scale ───────────────────────────────────────────────

/** Hero heading — Outfit Bold 30/40. Home greeting, auth screen titles. */
export function PageHero({ className, style, ...props }: TextProps) {
  return (
    <Text
      className={cn("font-display-bold text-foreground", className)}
      style={[{ fontSize: 30, lineHeight: 40 }, style] as StyleProp<TextStyle>}
      {...props}
    />
  );
}

/** Page title — Outfit Bold 26/34. Screen headings ("Settings", "My Friends"). */
export function PageTitle({ className, style, ...props }: TextProps) {
  return (
    <Text
      className={cn("font-display-bold text-foreground", className)}
      style={[{ fontSize: 26, lineHeight: 34 }, style] as StyleProp<TextStyle>}
      {...props}
    />
  );
}

/** Section heading — Outfit Bold 20/28. Dashboard section labels, profile name. */
export function SectionHeading({ className, style, ...props }: TextProps) {
  return (
    <Text
      className={cn("font-display-bold text-foreground", className)}
      style={[{ fontSize: 20, lineHeight: 28 }, style] as StyleProp<TextStyle>}
      {...props}
    />
  );
}

/** Numeric stat — Outfit Bold 24/32. Stat card values. */
export function StatDisplay({ className, style, ...props }: TextProps) {
  return (
    <Text
      className={cn("font-display-bold text-primary", className)}
      style={[{ fontSize: 24, lineHeight: 32 }, style] as StyleProp<TextStyle>}
      {...props}
    />
  );
}

// ── Inter Bold — Body strong scale ───────────────────────────────────────────

/** Strong body — Inter Bold 15/22. Item/friend names, action labels. */
export function BodyStrong({ className, style, ...props }: TextProps) {
  return (
    <Text
      className={cn("font-sans-bold text-foreground", className)}
      style={[{ fontSize: 15, lineHeight: 22 }, style] as StyleProp<TextStyle>}
      {...props}
    />
  );
}

/** Small strong label — Inter Bold 12/18. Counts, secondary badges, dot separators. */
export function LabelStrong({ className, style, ...props }: TextProps) {
  return (
    <Text
      className={cn("font-sans-bold text-foreground", className)}
      style={[{ fontSize: 12, lineHeight: 18 }, style] as StyleProp<TextStyle>}
      {...props}
    />
  );
}

// ── Inter Medium — Body scale ─────────────────────────────────────────────────

/** Standard body — Inter Medium 15/22. Settings labels, descriptive text. */
export function BodyText({ className, style, ...props }: TextProps) {
  return (
    <Text
      className={cn("font-sans-medium text-foreground", className)}
      style={[{ fontSize: 15, lineHeight: 22 }, style] as StyleProp<TextStyle>}
      {...props}
    />
  );
}

/** Secondary body — Inter Medium 13/20. Email, subtitles, muted descriptions. */
export function Caption({ className, style, ...props }: TextProps) {
  return (
    <Text
      className={cn("font-sans-medium text-muted-foreground", className)}
      style={[{ fontSize: 13, lineHeight: 20 }, style] as StyleProp<TextStyle>}
      {...props}
    />
  );
}

// ── Inter ExtraBold — Micro label scale ──────────────────────────────────────

/** Micro label — Inter ExtraBold 10/14, uppercase + wide tracking.
 *  Stat card labels/units, section headers, badge text. */
export function TinyLabel({ className, style, ...props }: TextProps) {
  return (
    <Text
      className={cn(
        "font-sans-extrabold text-muted-foreground uppercase tracking-widest",
        className,
      )}
      style={[{ fontSize: 10, lineHeight: 14 }, style] as StyleProp<TextStyle>}
      {...props}
    />
  );
}
