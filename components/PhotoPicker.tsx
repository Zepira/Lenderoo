import { useEffect, useState } from "react";
import { View, Alert, Pressable, Platform, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import * as ImagePickerExpo from "expo-image-picker";
import { Camera, X, Star } from "lucide-react-native";
import { Caption, TinyLabel } from "@/components/ui/typography";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { MAX_PHOTOS, addPhotos, makeCover, photosLeft, removePhoto } from "@/lib/item-photos";

interface PhotoPickerProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  label?: string;
  /** Open the camera / library choice straight away when there are no photos yet. */
  autoOpen?: boolean;
  /** At most this many (8, or 7 extra photos alongside a book's cover). */
  max?: number;
  /** The first photo is the cover (off for a book's extra photos). */
  cover?: boolean;
}

const THUMB = 88;

/**
 * An item's photos: a row of thumbnails (the first is the cover), × to remove, tap one to make it
 * the cover, and an Add tile for the camera or several photos from the library (up to 8).
 */
export function PhotoPicker({
  photos,
  onChange,
  label = "Photos",
  autoOpen,
  max = MAX_PHOTOS,
  cover = true,
}: PhotoPickerProps) {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;
  const [busy, setBusy] = useState(false);
  const left = photosLeft(photos, max);

  const permission = async (type: "camera" | "library") => {
    const { status } =
      type === "camera"
        ? await ImagePickerExpo.requestCameraPermissionsAsync()
        : await ImagePickerExpo.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        type === "camera"
          ? "Allow camera access to take photos of your things."
          : "Allow photo access to choose pictures of your things."
      );
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    setBusy(true);
    try {
      if (!(await permission("camera"))) return;
      // No crop step (see components/ImagePicker.tsx): uploads are resized anyway.
      const result = await ImagePickerExpo.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
      if (!result.canceled) onChange(addPhotos(photos, result.assets.map((a) => a.uri), max));
    } catch {
      Alert.alert("Couldn't take a photo", "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const chooseFromLibrary = async () => {
    setBusy(true);
    try {
      if (Platform.OS !== "web" && !(await permission("library"))) return;
      const result = await ImagePickerExpo.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: left,
        orderedSelection: true,
      });
      if (!result.canceled) onChange(addPhotos(photos, result.assets.map((a) => a.uri), max));
    } catch {
      Alert.alert("Couldn't add those photos", "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    if (left === 0) return;
    if (Platform.OS === "web") return void chooseFromLibrary();
    Alert.alert("Add photos", undefined, [
      { text: "Take Photo", onPress: () => void takePhoto() },
      { text: "Choose from Library", onPress: () => void chooseFromLibrary() },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const options = (i: number) => {
    const buttons = [
      ...(cover && i > 0 ? [{ text: "Make cover photo", onPress: () => onChange(makeCover(photos, i)) }] : []),
      { text: "Remove", style: "destructive" as const, onPress: () => onChange(removePhoto(photos, i)) },
      { text: "Cancel", style: "cancel" as const },
    ];
    Alert.alert(cover && i === 0 ? "Cover photo" : `Photo ${i + 1}`, undefined, buttons);
  };

  useEffect(() => {
    if (autoOpen && photos.length === 0) add();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TinyLabel style={{ flex: 1 }}>{label}</TinyLabel>
        <Caption style={{ color: theme.mutedForeground }}>
          {photos.length}/{max}
        </Caption>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 8, paddingBottom: 4, paddingRight: 8 }}>
        {photos.map((uri, i) => (
          <Pressable
            key={uri}
            onPress={() => options(i)}
            accessibilityRole="button"
            accessibilityLabel={cover && i === 0 ? "Cover photo. Options" : `Photo ${i + 1}. Options`}
            style={{ width: THUMB, height: THUMB }}
          >
            <Image
              source={{ uri }}
              style={{ width: THUMB, height: THUMB, borderRadius: 14, backgroundColor: theme.muted }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            {cover && i === 0 && (
              <View
                style={{
                  position: "absolute",
                  left: 6,
                  bottom: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  borderRadius: 8,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Star size={10} color="#fff" fill="#fff" />
                <Caption style={{ color: "#fff", fontSize: 11, lineHeight: 14 }}>Cover</Caption>
              </View>
            )}
            <Pressable
              onPress={() => onChange(removePhoto(photos, i))}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove photo ${i + 1}`}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: theme.foreground,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={14} color={theme.background} />
            </Pressable>
          </Pressable>
        ))}
        {left > 0 && (
          <Pressable
            onPress={add}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Add photos"
          >
            <View
              style={{
                width: THUMB,
                height: THUMB,
                borderRadius: 14,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: theme.mutedForeground,
                backgroundColor: isDark ? theme.muted : "#F3F4F6",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? <ActivityIndicator /> : <Camera size={22} color={theme.mutedForeground} />}
              <Caption style={{ color: theme.mutedForeground, fontSize: 12, lineHeight: 16 }}>Add</Caption>
            </View>
          </Pressable>
        )}
      </ScrollView>
      {cover && photos.length > 1 && (
        <Caption style={{ color: theme.mutedForeground, fontSize: 12, lineHeight: 16 }}>
          Tap a photo to make it the cover.
        </Caption>
      )}
    </View>
  );
}
