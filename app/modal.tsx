import { View, Linking, Pressable, TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/text";

export default function ModalScreen() {
  return (
    <View className="flex-1 items-center justify-center p-4">
      <View className="flex-row gap-2 flex-wrap justify-center">
        <Text className="text-center">
          Made with shadcn/ui for React Native
        </Text>
        <TouchableOpacity
          onPress={() => Linking.openURL("https://ui.shadcn.com")}
        >
          <Text className="text-blue-600">Visit shadcn/ui</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
