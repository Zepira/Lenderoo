/**
 * FeedbackModal Component
 *
 * Modal for users to submit feedback
 */

import { useState } from "react";
import { Modal, View, ActivityIndicator, Alert } from "react-native";
import { X } from "lucide-react-native";
import { Button } from "./ui/button";
import { Text } from "./ui/text";
import { Textarea } from "./ui/textarea";
import { submitFeedback } from "@/lib/feedback-service";
import * as toast from "@/lib/toast";

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert("Required", "Please enter your feedback before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      await submitFeedback(comment);
      toast.success("Thanks for your feedback!");
      setComment("");
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
    if (comment.trim() && !submitting) {
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
              onClose();
            },
          },
        ]
      );
    } else {
      setComment("");
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
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-background rounded-t-3xl p-6 pb-8">
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
      </View>
    </Modal>
  );
}
