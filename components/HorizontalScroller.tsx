import { useState, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface HorizontalScrollerProps {
  children: ReactNode;
  /** The parent's horizontal padding. The scroller extends this far past it
   *  on both sides, so content runs to the screen edge instead of being cut
   *  off at the padding; at rest the first item still lines up with it. */
  bleed: number;
  /** The background behind the scroller (a #RRGGBB hex); the edge fades
   *  blend into it. */
  fadeColor: string;
  /** Gap between items. */
  gap?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/** Wide enough to read as "there's more", narrow enough not to hide a card. */
const FADE_WIDTH = 28;

/** Sideways scroller that fades out at either edge while there is more to
 *  scroll that way. */
export function HorizontalScroller({
  children,
  bleed,
  fadeColor,
  gap,
  contentContainerStyle,
}: HorizontalScrollerProps) {
  const [viewWidth, setViewWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [offset, setOffset] = useState(0);

  const maxOffset = Math.max(0, contentWidth - viewWidth);
  const moreLeft = offset > 1;
  const moreRight = offset < maxOffset - 1;
  const clear = hexToTransparent(fadeColor);

  return (
    <View style={{ marginHorizontal: -bleed }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        onLayout={(e: LayoutChangeEvent) => setViewWidth(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContentWidth(w)}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
          setOffset(e.nativeEvent.contentOffset.x)
        }
        contentContainerStyle={[{ paddingHorizontal: bleed, gap }, contentContainerStyle]}
      >
        {children}
      </ScrollView>
      {moreLeft && (
        <LinearGradient
          pointerEvents="none"
          colors={[fadeColor, clear]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fade, { left: 0 }]}
        />
      )}
      {moreRight && (
        <LinearGradient
          pointerEvents="none"
          colors={[clear, fadeColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fade, { right: 0 }]}
        />
      )}
    </View>
  );
}

// A fully transparent version of the same colour; fading to plain
// "transparent" goes through grey on iOS.
function hexToTransparent(hex: string): string {
  const h = hex.replace("#", "");
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0)`;
}

const styles = StyleSheet.create({
  fade: { position: "absolute", top: 0, bottom: 0, width: FADE_WIDTH },
});
