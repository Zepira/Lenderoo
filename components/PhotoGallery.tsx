import { useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { Caption } from "@/components/ui/typography";

const pageOf = (e: NativeSyntheticEvent<NativeScrollEvent>, width: number) =>
  Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));

/** Little dots for which photo is showing (and a "2/5" for screen readers). */
export function PhotoDots({ count, index, style }: { count: number; index: number; style?: object }) {
  if (count < 2) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityLabel={`Photo ${index + 1} of ${count}`}
      style={[{ flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" }, style]}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: i === index ? 18 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === index ? "#fff" : "rgba(255,255,255,0.55)",
          }}
        />
      ))}
    </View>
  );
}

/**
 * The item page's photos: swipe between them, tap to open full screen (lib/item-photos.ts; the
 * first is the cover). Fills its parent; `children` draws on top (gradients, title), and should
 * pass touches through (pointerEvents="none" / "box-none") so swiping still works.
 */
export function PhotoGallery({
  photos,
  height,
  index,
  onIndexChange,
  onOpen,
}: {
  photos: string[];
  height: number;
  index: number;
  onIndexChange: (i: number) => void;
  onOpen: (i: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const listRef = useRef<FlatList<string>>(null);
  const shown = useRef(index);
  // Follow along when the index changes from outside (closing the full-screen viewer).
  useEffect(() => {
    if (width > 0 && index !== shown.current && index < photos.length) {
      shown.current = index;
      listRef.current?.scrollToIndex({ index, animated: false });
    }
  }, [index, width, photos.length]);
  return (
    <View style={{ height, width: "100%" }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(uri, i) => `${i}:${uri}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={photos.length > 1}
          onMomentumScrollEnd={(e) => {
            shown.current = pageOf(e, width);
            onIndexChange(shown.current);
          }}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item: uri, index: i }) => (
            <Pressable
              onPress={() => onOpen(i)}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Photo ${i + 1} of ${photos.length}. Open full screen`}
            >
              <Image
                source={{ uri }}
                style={{ width, height }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

/** Full-screen photos: swipe between them, pinch to zoom (iOS), close with ×. */
export function PhotoViewer({
  photos,
  startIndex,
  visible,
  onClose,
}: {
  photos: string[];
  startIndex: number;
  visible: boolean;
  onClose: (lastIndex: number) => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);
  const listRef = useRef<FlatList<string>>(null);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onShow={() => setIndex(startIndex)}
      onRequestClose={() => onClose(index)}
      supportedOrientations={["portrait", "landscape"]}
    >
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(uri, i) => `${i}:${uri}`}
          horizontal
          pagingEnabled
          initialScrollIndex={startIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(pageOf(e, width))}
          renderItem={({ item: uri }) => (
            <ScrollView
              style={{ width, height }}
              contentContainerStyle={{ width, height, alignItems: "center", justifyContent: "center" }}
              maximumZoomScale={3}
              minimumZoomScale={1}
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image source={{ uri }} style={{ width, height }} contentFit="contain" cachePolicy="memory-disk" />
            </ScrollView>
          )}
        />
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 16,
            right: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Pressable
            onPress={() => onClose(index)}
            accessibilityRole="button"
            accessibilityLabel="Close photos"
            hitSlop={10}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center", marginRight: 40 }} pointerEvents="none">
            {photos.length > 1 && (
              <Caption style={{ color: "#fff", fontWeight: "600" }}>
                {index + 1} / {photos.length}
              </Caption>
            )}
          </View>
        </View>
        <PhotoDots
          count={photos.length}
          index={index}
          style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + 24 }}
        />
      </View>
    </Modal>
  );
}
