import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import {
  BookOpen,
  Drill,
  Castle,
  Tent,
  Shirt,
  Caravan,
} from "lucide-react-native";

const ICONS = [BookOpen, Drill, Castle, Tent, Shirt, Caravan];
const INTERVAL = 2500;

export function AuthIconBox() {
  const [iconIndex, setIconIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIconIndex((i) => (i + 1) % ICONS.length);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const Icon = ICONS[iconIndex];

  return (
    <View className="w-24 h-24 bg-secondary rounded-lg items-center justify-center mb-6 overflow-hidden">
      <Animated.View
        key={iconIndex}
        entering={FadeInDown.springify().stiffness(150).damping(25)}
        exiting={FadeOutUp.duration(200)}
      >
        <Icon size={40} color="white" />
      </Animated.View>
    </View>
  );
}
