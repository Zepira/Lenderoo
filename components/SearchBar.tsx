/**
 * SearchBar Component
 *
 * Reusable search input component with clear button
 */

import {
  View,
  type TextInputProps,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { Search, X } from "lucide-react-native";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps
  extends Omit<TextInputProps, "value" | "onChangeText"> {
  /** Current search value */
  value: string;
  /** Handler when search value changes */
  onChangeText: (text: string) => void;
  /** Handler when clear button is pressed */
  onClear?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional class names */
  className?: string;
}

export function SearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = "Search...",
  className,
  ...props
}: SearchBarProps) {
  const handleClear = () => {
    onChangeText("");
    onClear?.();
  };

  return (
    <View className={cn("relative", className)}>
      <Search
        size={20}
        color="#888"
        style={{ position: "absolute", left: 12, top: 10, zIndex: 1 }}
      />

      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        className="pl-10 pr-10"
        {...props}
      />

      {value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          className="absolute right-3 top-2.5 p-1"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <X size={18} color="#888" />
        </TouchableOpacity>
      )}
    </View>
  );
}
