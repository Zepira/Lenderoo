import { useState } from 'react';
import {
  Modal,
  View,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePickerExpo from 'expo-image-picker';
import { Camera, ImageIcon, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PRESET_AVATARS, type PresetAvatar } from '@/lib/services/avatar';
import { PageTitle, BodyText, TinyLabel, Caption } from '@/components/ui/typography';
import { THEME } from '@/lib/theme';
import { useThemeContext } from '@/contexts/ThemeContext';

interface AvatarPickerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called with `preset:id` string when a preset is chosen. */
  onSelectPreset: (presetUrl: string) => void;
  /** Called with the local image URI when camera/gallery is used. */
  onSelectImage: (uri: string) => void;
  uploading?: boolean;
}

export function AvatarPickerModal({
  visible,
  onClose,
  onSelectPreset,
  onSelectImage,
  uploading = false,
}: AvatarPickerModalProps) {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === 'dark';
  const insets = useSafeAreaInsets();

  const requestPermission = async (type: 'camera' | 'library') => {
    if (type === 'camera') {
      const { status } = await ImagePickerExpo.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take a photo.');
        return false;
      }
    } else {
      const { status } = await ImagePickerExpo.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library permission is needed to choose an image.');
        return false;
      }
    }
    return true;
  };

  const handleTakePhoto = async () => {
    if (!(await requestPermission('camera'))) return;
    const result = await ImagePickerExpo.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onSelectImage(result.assets[0].uri);
    }
  };

  const handleChooseFromLibrary = async () => {
    if (!(await requestPermission('library'))) return;
    const result = await ImagePickerExpo.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onSelectImage(result.assets[0].uri);
    }
  };

  const bg = isDark ? '#1F2937' : '#FFFFFF';
  const mutedBg = isDark ? '#374151' : '#F3F4F6';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
        onPress={onClose}
      />

      {/* Sheet */}
      <View
        style={{
          backgroundColor: bg,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: insets.bottom + 24,
          // Pull sheet up from the absolute bottom of the Modal
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        {/* Handle + header */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View
            style={{
              width: 40, height: 4,
              borderRadius: 2,
              backgroundColor: borderColor,
              marginBottom: 20,
            }}
          />
          <PageTitle>Choose Avatar</PageTitle>
        </View>

        {/* Preset grid — 3 explicit rows so justifyContent centers correctly */}
        <TinyLabel className="mb-3 text-center">Choose a character</TinyLabel>
        <View style={{ gap: 12 }}>
          {[0, 3, 6].map((start) => (
            <View
              key={start}
              style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}
            >
              {PRESET_AVATARS.slice(start, start + 3).map((avatar) => (
                <PresetAvatarTile
                  key={avatar.id}
                  avatar={avatar}
                  onPress={() => onSelectPreset(`preset:${avatar.id}`)}
                  disabled={uploading}
                />
              ))}
            </View>
          ))}
        </View>

        {/* Divider */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginVertical: 20,
            gap: 12,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: borderColor }} />
          <Caption>or use your own photo</Caption>
          <View style={{ flex: 1, height: 1, backgroundColor: borderColor }} />
        </View>

        {/* Camera / Library buttons */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={handleTakePhoto}
            disabled={uploading}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: mutedBg,
              borderRadius: 16,
              paddingVertical: 16,
              opacity: pressed || uploading ? 0.6 : 1,
            })}
          >
            <Camera size={20} color={THEME.light.primary} />
            <BodyText className="text-foreground text-center">Take Photo</BodyText>
          </Pressable>

          <Pressable
            onPress={handleChooseFromLibrary}
            disabled={uploading}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: mutedBg,
              borderRadius: 16,
              paddingVertical: 16,
              opacity: pressed || uploading ? 0.6 : 1,
            })}
          >
            <ImageIcon size={20} color={THEME.light.primary} />
            <BodyText className="text-foreground text-center">Gallery</BodyText>
          </Pressable>
        </View>

        {uploading && (
          <View style={{ alignItems: 'center', marginTop: 16, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            <ActivityIndicator size="small" color={THEME.light.primary} />
            <Caption>Saving avatar…</Caption>
          </View>
        )}

        {/* Close button */}
        <Pressable
          onPress={onClose}
          disabled={uploading}
          style={({ pressed }) => ({
            marginTop: 16,
            alignItems: 'center',
            paddingVertical: 12,
            opacity: pressed || uploading ? 0.5 : 1,
          })}
        >
          <BodyText className="text-muted-foreground">Cancel</BodyText>
        </Pressable>
      </View>
    </Modal>
  );
}

function PresetAvatarTile({
  avatar,
  onPress,
  disabled,
}: {
  avatar: PresetAvatar;
  onPress: () => void;
  disabled: boolean;
}) {
  // 3 columns with 12px gaps → (screenWidth - 48px padding - 24px gaps) / 3 ≈ 80px
  // Using a fixed size here; parent ScrollView handles overflow.
  const SIZE = 80;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        width: SIZE,
        alignItems: 'center',
        gap: 6,
        opacity: pressed || disabled ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: THEME.light.primary + '33',
          backgroundColor: THEME.light.primary + '11',
        }}
      >
        <Image
          source={avatar.source}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>
      <TinyLabel className="text-center normal-case tracking-normal" style={{ fontSize: 9 }}>
        {avatar.name}
      </TinyLabel>
    </Pressable>
  );
}
