import { Stack, useRouter } from "expo-router";
import { YStack, XStack, Text, Card, ScrollView } from "tamagui";
import * as Icons from "@tamagui/lucide-icons";
import { CATEGORY_CONFIG, type ItemCategory } from "lib/constants";

const CATEGORY_ICONS_MAP: Record<ItemCategory, keyof typeof Icons> = {
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
    // For books, use specialized flow
    if (category === "book") {
      router.push("/add-item/book" as any);
    } else {
      // For other categories, use generic form
      router.push(`/add-item/generic?category=${category}` as any);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Add Item",
          presentation: "modal",
        }}
      />

      <ScrollView flex={1} bg="$background">
        <YStack p="$4" gap="$4">
          <YStack gap="$2">
            <Text fontSize="$7" fontWeight="700" color="$color">
              What are you lending?
            </Text>
            <Text fontSize="$4" color="$gray11">
              Select the type of item to get started
            </Text>
          </YStack>

          <YStack gap="$3" pt="$2">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const category = key as ItemCategory;
              const IconComponent = Icons[CATEGORY_ICONS_MAP[category]] as any;

              return (
                <Card
                  key={category}
                  elevate
                  size="$4"
                  bordered
                  animation="bouncy"
                  scale={0.98}
                  hoverStyle={{ scale: 1 }}
                  pressStyle={{ scale: 0.96 }}
                  onPress={() => handleCategorySelect(category)}
                  bg="$background"
                  cursor="pointer"
                >
                  <Card.Header padded>
                    <XStack gap="$4" items="center">
                      <YStack
                        width={60}
                        height={60}
                        rounded="$4"
                        bg="$blue2"
                        borderColor="$blue7"
                        borderWidth={1}
                        items="center"
                        justify="center"
                      >
                        <IconComponent size={32} color="$blue10" />
                      </YStack>

                      <YStack flex={1} gap="$1">
                        <Text fontSize="$6" fontWeight="600" color="$color">
                          {config.label}
                        </Text>
                        {category === "book" && (
                          <Text fontSize="$3" color="$blue10" fontWeight="500">
                            Auto-fill from Open Library
                          </Text>
                        )}
                      </YStack>

                      <Icons.ChevronRight size={24} color="$gray10" />
                    </XStack>
                  </Card.Header>
                </Card>
              );
            })}
          </YStack>
        </YStack>
      </ScrollView>
    </>
  );
}
