/**
 * FeedbackModal Component
 *
 * Modal for users to submit feedback
 */

import { useState } from "react";
import {
  Modal,
  View,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePickerExpo from "expo-image-picker";
import { X, ImagePlus } from "lucide-react-native";
import { Button } from "./ui/button";
import { Text } from "./ui/text";
import { Textarea } from "./ui/textarea";
import { submitFeedback } from "@/lib/services/feedback";
import * as toast from "@/lib/toast";

const MAX_SCREENSHOTS = 3;

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const insets = useSafeAreaInsets();
  const [comment, setComment] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleAddScreenshot = async () => {
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePickerExpo.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library permission is required to attach a screenshot.",
        );
        return;
      }
    }

    const result = await ImagePickerExpo.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: Platform.OS !== "web",
      selectionLimit: MAX_SCREENSHOTS - screenshots.length,
      quality: 0.8,
    });

    if (result.canceled) return;

    const uris = result.assets.map((a) => a.uri);
    setScreenshots((prev) => [...prev, ...uris].slice(0, MAX_SCREENSHOTS));
  };

  const handleRemoveScreenshot = (uri: string) => {
    setScreenshots((prev) => prev.filter((s) => s !== uri));
  };

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert("Required", "Please enter your feedback before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      await submitFeedback(comment, screenshots);
      toast.success("Thanks for your feedback!");
      setComment("");
      setScreenshots([]);
      onClose();
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to submit feedback";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if ((comment.trim() || screenshots.length > 0) && !submitting) {
      Alert.alert(
        "Discard Feedback?",
        "You have unsaved feedback. Are you sure you want to close?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setComment("");
              setScreenshots([]);
              onClose();
            },
          },
        ]
      );
    } else {
      setComment("");
      setScreenshots([]);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      {/*
        RN's Modal renders as a separate native Android Dialog window that
        doesn't reliably inherit windowSoftInputMode, so plain
        KeyboardAvoidingView silently fails to shift content above the
        keyboard on Android inside a Modal (it works fine on iOS, which is
        why this can slip by in testing). KeyboardAwareScrollView sidesteps
        that entirely — it measures and scrolls to the focused input itself
        instead of relying on OS resize behavior. Use this pattern for any
        Modal-based sheet with a TextInput, not KeyboardAvoidingView.
      */}
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={24}
      >
        {/* Backdrop tap-to-close — safety net so the sheet is never unreachable */}
        <Pressable onPress={handleClose} style={{ flex: 1 }} />
        <View
          className="bg-background rounded-t-3xl p-6"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text variant="h3" className="font-bold">
              Send Feedback
            </Text>
            <Button
              variant="ghost"
              size="icon"
              onPress={handleClose}
              disabled={submitting}
            >
              <X size={24} />
            </Button>
          </View>

          {/* Description */}
          <Text variant="default" className="text-muted-foreground mb-4">
            We'd love to hear your thoughts! Share any feedback, suggestions, or
            issues you've encountered.
          </Text>

          {/* Feedback Input */}
          <View className="mb-4">
            <Textarea
              value={comment}
              onChangeText={setComment}
              placeholder="What's on your mind?"
              numberOfLines={6}
              editable={!submitting}
              autoFocus
              className="min-h-[120px]"
            />
            <Text variant="small" className="text-muted-foreground mt-2">
              {comment.length} / 1000 characters
            </Text>
          </View>

          {/* Screenshots */}
          <View className="mb-4 gap-2">
            {screenshots.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {screenshots.map((uri) => (
                    <View key={uri} className="relative">
                      <Image
                        source={{ uri }}
                        style={{ width: 72, height: 72, borderRadius: 10 }}
                      />
                      <Pressable
                        onPress={() => handleRemoveScreenshot(uri)}
                        disabled={submitting}
                        className="absolute -top-2 -right-2 bg-background rounded-full"
                      >
                        <View className="w-6 h-6 rounded-full bg-destructive items-center justify-center">
                          <X size={14} color="#fff" />
                        </View>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
            {screenshots.length < MAX_SCREENSHOTS && (
              <Button
                variant="outline"
                size="sm"
                onPress={handleAddScreenshot}
                disabled={submitting}
                className="self-start"
              >
                <ImagePlus size={16} />
                <Text>Add Screenshot</Text>
              </Button>
            )}
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              onPress={handleClose}
              disabled={submitting}
              className="flex-1"
            >
              <Text>Cancel</Text>
            </Button>
            <Button
              onPress={handleSubmit}
              disabled={submitting || !comment.trim()}
              className="flex-1 bg-primary"
            >
              {submitting && <ActivityIndicator size="small" color="#fff" />}
              <Text className="text-black">
                {submitting ? "Sending..." : "Send Feedback"}
              </Text>
            </Button>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </Modal>
  );
}
