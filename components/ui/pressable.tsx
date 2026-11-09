import { useState, type ComponentRef, type Ref } from "react";
import {
  Pressable as RNPressable,
  type PressableProps,
  type PressableStateCallbackType,
} from "react-native";

/**
 * Drop-in for React Native's Pressable that supports `style={({ pressed }) => …}`.
 *
 * NativeWind's interop (react-native-css-interop 0.2.6, RN 0.88) drops a
 * function `style` on RN's Pressable, so rows styled that way lost their
 * background, padding and row layout (Friends list). This resolves the
 * function itself from its own pressed state and hands RN a plain style.
 */
export function Pressable({
  style,
  onPressIn,
  onPressOut,
  ref,
  ...props
}: PressableProps & { ref?: Ref<ComponentRef<typeof RNPressable>> }) {
  const [pressed, setPressed] = useState(false);
  const resolvedStyle =
    typeof style === "function"
      ? style({ pressed, hovered: false } as PressableStateCallbackType)
      : style;

  return (
    <RNPressable
      ref={ref}
      {...props}
      style={resolvedStyle}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
    />
  );
}
