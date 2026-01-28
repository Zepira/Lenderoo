import { useRouter } from "expo-router";
import { ScrollView, View, TouchableOpacity } from "react-native";
import { Card, CardHeader } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { FloatingBackButton } from "components/FloatingBackButton";
import * as LucideIcons from "lucide-react-native";
import { CATEGORY_CONFIG, type ItemCategory } from "lib/constants";
import { SafeAreaWrapper } from "@/components/SafeAreaWrapper";

const CATEGORY_ICONS_MAP: Record<ItemCategory, keyof typeof LucideIcons> = {
  book: "Book",
  tool: "Wrench",
  clothing: "Shirt",
  electronics: "Laptop",
  game: "Gamepad2",
  sports: "Dumbbell",
  kitchen: "ChefHat",
  other: "Package",
};

export default function SelectCategoryScreen() {
  const router = useRouter();

  const handleCategorySelect = (category: ItemCategory) => {
    // For books, use search flow
    if (category === "book") {
      router.push("/add-item/search" as any);
    } else {
      // For other categories, use generic form
      router.push(`/add-item/generic?category=${category}` as any);
    }
  };

  return (
    <SafeAreaWrapper>
      <FloatingBackButton />

      <ScrollView className="flex-1 bg-background">
        <View className="p-4 gap-4">
          <View className="gap-2 items-center ">
            <Text variant="h1" className="font-bold px-8">
              What are you lending?
            </Text>
            <Text variant="muted">Select the type of item to get started</Text>
          </View>

          <View className="gap-3 pt-2">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const category = key as ItemCategory;
              const IconComponent = (LucideIcons as any)[
                CATEGORY_ICONS_MAP[category]
              ];

              return (
                <TouchableOpacity
                  key={category}
                  activeOpacity={0.7}
                  onPress={() => {
                    handleCategorySelect(category);
                  }}
                >
                  <Card>
                    <CardHeader>
                      <View className="flex-row gap-4 items-center">
                        <View className="w-[60px] h-[60px] rounded-lg bg-blue-50 border border-blue-200 items-center justify-center">
                          <IconComponent size={32} color="#3b82f6" />
                        </View>

                        <View className="flex-1 gap-1">
                          <Text variant="large" className="font-semibold">
                            {config.label}
                          </Text>
                          {category === "book" && (
                            <Text
                              variant="small"
                              className="text-blue-600 font-medium"
                            >
                              Auto-fill from Hardcover
                            </Text>
                          )}
                        </View>

                        <LucideIcons.ChevronRight size={24} color="#9ca3af" />
                      </View>
                    </CardHeader>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
