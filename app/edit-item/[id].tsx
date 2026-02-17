import { useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { useItem } from "hooks";

export default function EditItemRouter() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { item, loading } = useItem(id!);

  useEffect(() => {
    if (!loading && item) {
      // Route to the appropriate edit screen based on category
      if (item.category === "book") {
        // Build params from item data
        const params = new URLSearchParams({
          itemId: item.id,
          title: item.name,
          ...((item.images?.[0] || item.imageUrls?.[0] || item.imageUrl) && {
            coverUrl: item.images?.[0] || item.imageUrls?.[0] || item.imageUrl
          }),
          ...(item.description && { description: item.description }),
          ...(item.notes && { notes: item.notes }),
          ...(item.borrowedBy && { borrowedBy: item.borrowedBy }),
        });

        // Add book-specific metadata
        if (item.metadata) {
          const metadata = item.metadata as any;
          if (metadata.author) params.set("author", metadata.author);
          if (metadata.seriesName) params.set("seriesName", metadata.seriesName);
          if (metadata.seriesNumber)
            params.set("seriesNumber", metadata.seriesNumber.toString());
          if (metadata.seriesId)
            params.set("seriesId", metadata.seriesId.toString());
          if (metadata.genre) params.set("genre", metadata.genre);
          if (metadata.synopsis) params.set("synopsis", metadata.synopsis);
          if (metadata.isbn) params.set("isbn", metadata.isbn);
          if (metadata.pageCount)
            params.set("pageCount", metadata.pageCount.toString());
          if (metadata.publicationYear)
            params.set("publicationYear", metadata.publicationYear.toString());
          if (metadata.averageRating)
            params.set("averageRating", metadata.averageRating.toString());
          if (metadata.hardcoverId)
            params.set("hardcoverId", metadata.hardcoverId);
        }

        router.replace(`/edit-item/book?${params.toString()}` as any);
      } else {
        // For generic items
        const params = new URLSearchParams({
          itemId: item.id,
          category: item.category,
          name: item.name,
          ...(item.description && { description: item.description }),
          ...((item.images?.[0] || item.imageUrls?.[0] || item.imageUrl) && {
            imageUrl: item.images?.[0] || item.imageUrls?.[0] || item.imageUrl
          }),
          ...(item.notes && { notes: item.notes }),
          ...(item.borrowedBy && { borrowedBy: item.borrowedBy }),
        });

        router.replace(`/edit-item/generic?${params.toString()}` as any);
      }
    } else if (!loading && !item) {
      // Item not found, go back
      router.back();
    }
  }, [item, loading, router]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" />
      <Text variant="muted" className="mt-4">
        Loading item...
      </Text>
    </View>
  );
}
