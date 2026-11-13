import type { ViewStyle } from "react-native";

/**
 * The widest a column of text, rows or form fields gets. A phone never reaches it; on an iPad
 * settings, forms and detail pages sit in a centred column instead of stretching edge to edge.
 */
export const READABLE_WIDTH = 760;

/** Spread into a content container's style to centre it at READABLE_WIDTH on wide screens. */
export const readableColumn: ViewStyle = {
  width: "100%",
  maxWidth: READABLE_WIDTH,
  alignSelf: "center",
};

/**
 * Side padding that keeps a full-width bar's contents (a form's Cancel/Save row) in the same
 * centred column as the content above: `min` on a phone, more on an iPad.
 */
export function readableSidePadding(screenWidth: number, min = 16): number {
  return Math.max(min, (screenWidth - READABLE_WIDTH) / 2);
}
