import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  type ScrollViewInstance,
  type ScrollViewProps,
} from "react-native";

/**
 * KeyboardAwareScrollView
 *
 * A ScrollView that keeps the focused input above the software keyboard.
 *
 * Why this exists: Android no longer resizes or pans the window for the
 * keyboard (edge-to-edge, target SDK 35+), so nothing moves the app out of the
 * keyboard's way on its own. React Native's `Keyboard` events still report
 * where the keyboard is, so this component pads its content by the keyboard
 * height (giving the ScrollView something to scroll into) and then scrolls the
 * focused input above the keyboard. Both steps are plain JS/layout and work the
 * same on iOS.
 *
 * See docs/KEYBOARD_HANDLING.md for the long version.
 */
export type KeyboardAwareScrollViewProps = ScrollViewProps & {
  /** Gap kept between the focused input and the top of the keyboard. */
  extraScrollHeight?: number;
};

export const KeyboardAwareScrollView = forwardRef<
  ScrollViewInstance,
  KeyboardAwareScrollViewProps
>(function KeyboardAwareScrollView(
  {
    extraScrollHeight = 24,
    style,
    contentContainerStyle,
    keyboardShouldPersistTaps = "handled",
    onScroll,
    children,
    ...props
  },
  ref,
) {
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  useImperativeHandle(
    ref,
    () => scrollViewRef.current as ScrollViewInstance,
    [],
  );

  // Scroll as soon as the padding lands, i.e. when the content grows enough to
  // reveal the focused input. Doing it from onContentSizeChange avoids racing
  // the keyboard animation with a setTimeout.
  const pendingReveal = useRef(false);
  const scrollOffsetY = useRef(0);
  const keyboardScreenY = useRef<number | null>(null);
  const [paddingBottom, setPaddingBottom] = useState(0);

  const revealFocusedInput = useCallback(() => {
    const focusedInput = TextInput.State.currentlyFocusedInput();
    const scrollView = scrollViewRef.current;
    const keyboardTop = keyboardScreenY.current;
    if (!focusedInput || !scrollView || keyboardTop === null) return;

    focusedInput.measureInWindow((_x, y, _width, height) => {
      const overlap = y + height + extraScrollHeight - keyboardTop;
      if (overlap <= 0) return;
      scrollView.scrollTo({
        y: scrollOffsetY.current + overlap,
        animated: true,
      });
    });
  }, [extraScrollHeight]);

  useEffect(() => {
    // Web has no software keyboard overlay to compensate for (and no usable
    // metrics); the plain ScrollView is already correct there.
    if (Platform.OS === "web") return;

    // iOS announces the keyboard before it opens; Android has no "willShow".
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      pendingReveal.current = true;
      // Kept from the event rather than read from Keyboard.metrics(), which is
      // only populated on Android and on iOS not until keyboardDidShow — too
      // late for the iOS keyboardWillShow path.
      keyboardScreenY.current = event.endCoordinates.screenY;
      setPaddingBottom(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      pendingReveal.current = false;
      keyboardScreenY.current = null;
      setPaddingBottom(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <ScrollView
      ref={scrollViewRef}
      scrollEventThrottle={16}
      {...props}
      style={[{ flex: 1 }, style]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      onScroll={(event) => {
        scrollOffsetY.current = event.nativeEvent.contentOffset.y;
        onScroll?.(event);
      }}
      onContentSizeChange={(width, height) => {
        if (pendingReveal.current) {
          pendingReveal.current = false;
          revealFocusedInput();
        }
        props.onContentSizeChange?.(width, height);
      }}
      contentContainerStyle={[
        contentContainerStyle,
        paddingBottom > 0 && { paddingBottom },
      ]}
    >
      {children}
    </ScrollView>
  );
});
