import { useState } from "react";
import { View, Image, Alert, Pressable } from "react-native";
import * as ImagePickerExpo from "expo-image-picker";
import { Camera, ImageIcon, X } from "lucide-react-native";
import { Button } from "./ui/button";
import { Text } from "./ui/text";

interface ImagePickerProps {
  imageUrl?: string;
  onImageSelected: (uri: string) => void;
  onImageRemoved: () => void;
}

export function ImagePicker({
  imageUrl,
  onImageSelected,
  onImageRemoved,
}: ImagePickerProps) {
  const [loading, setLoading] = useState(false);

  const requestPermissions = async (type: "camera" | "library") => {
    if (type === "camera") {
      const { status } = await ImagePickerExpo.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera permission is required to take photos.",
          [{ text: "OK" }]
        );
        return false;
      }
    } else {
      const { status } =
        await ImagePickerExpo.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library permission is required to choose images.",
          [{ text: "OK" }]
        );
        return false;
      }
    }
    return true;
  };

  const takePhoto = async () => {
    try {
      setLoading(true);

      const hasPermission = await requestPermissions("camera");
      if (!hasPermission) return;

      const result = await ImagePickerExpo.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const chooseFromLibrary = async () => {
    try {
      setLoading(true);

      const hasPermission = await requestPermissions("library");
      if (!hasPermission) return;

      const result = await ImagePickerExpo.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error choosing image:", error);
      Alert.alert("Error", "Failed to choose image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = () => {
    Alert.alert(
      "Add Image",
      "Choose a method to add an image",
      [
        {
          text: "Take Photo",
          onPress: takePhoto,
        },
        {
          text: "Choose from Library",
          onPress: chooseFromLibrary,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View className="gap-3">
      {imageUrl ? (
        <View className="items-center gap-2">
          <View className="w-[150px] h-[225px] rounded-lg overflow-hidden items-center justify-center bg-muted">
            <Image
              source={{ uri: imageUrl }}
              style={{ width: 150, height: 225 }}
              resizeMode="cover"
            />
          </View>
          <Button
            variant="outline"
            size="sm"
            onPress={onImageRemoved}
            disabled={loading}
          >
            <X size={16} />
            <Text>Remove Image</Text>
          </Button>
        </View>
      ) : (
        <View className="items-center gap-2">
          <View className="w-[150px] h-[225px] rounded-lg overflow-hidden items-center justify-center bg-muted">
            <ImageIcon size={60} color="#9ca3af" />
          </View>
          <Button
            variant="outline"
            size="sm"
            onPress={handleAddImage}
            disabled={loading}
          >
            <Camera size={16} />
            <Text>{loading ? "Loading..." : "Add Image"}</Text>
          </Button>
        </View>
      )}
    </View>
  );
}
