/**
 * Hardcover API Helper
 * Handles API calls with fallback for CORS issues
 */

import { Platform } from "react-native";

interface HardcoverQueryOptions {
  query: string;
  variables?: Record<string, any>;
}
const token = process.env.EXPO_PUBLIC_HARDCOVER_API_TOKEN;

/**
 * Make a GraphQL query to Hardcover API
 * Uses Supabase Edge Function proxy on web to avoid CORS
 * Uses direct API call on native platforms
 */
export async function queryHardcover({
  query,
  variables = {},
}: HardcoverQueryOptions) {
  const endpoint = "https://api.hardcover.app/v1/graphql";
  const isWeb = Platform.OS === "web";

  try {
    console.log("🔍 Making Hardcover API request:", {
      endpoint,
      platform: Platform.OS,
      isWeb,
      hasToken: !!token,
      variables,
    });

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // For web (using Supabase proxy), add Supabase auth headers

    // For native, add Hardcover token directly

    headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    console.log("📡 Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API error response:", errorText);
      throw new Error(`Hardcover API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ API response received");
    console.log("📊 Full response data:", JSON.stringify(data, null, 2));

    if (data.errors) {
      console.error("❌ GraphQL errors:", data.errors);
      throw new Error(
        `GraphQL errors: ${data.errors.map((e: any) => e.message).join(", ")}`
      );
    }

    return data.data;
  } catch (error) {
    console.error("❌ Hardcover API error:", error);
    // Check if it's a network/CORS error
    if (
      error instanceof TypeError &&
      (error.message.includes("Network request failed") ||
        error.message.includes("Failed to fetch"))
    ) {
      if (isWeb) {
        console.error(
          "🌐 CORS/Network error on web. Make sure Supabase Edge Function is deployed."
        );
      } else {
        console.error("🌐 Network error. Check your internet connection.");
      }
    }
    throw error;
  }
}

/**
 * Search for books by query string
 */
export async function searchBooks(searchQuery: string, token?: string) {
  const query = `
    query SearchBooks($query: String!) {
      search(query: $query, query_type: "books", per_page: 15, sort:"activities_count:desc") {
        results
      }
    }
  `;

  const data = await queryHardcover({
    query,
    variables: { query: searchQuery },
  });

  const results = data.search?.results;
  if (!results) return [];

  console.log("📦 Raw results:", results);

  // Hardcover API structure: results.hits contains the actual array of books
  if (results.hits && Array.isArray(results.hits)) {
    console.log("✅ Found", results.hits.length, "books in results.hits");
    return results.hits;
  }

  // Fallback: if hits is not found, return empty array
  console.warn("⚠️ No hits array found in results");
  return [];
}

/**
 * Get series details including all books in the series
 */
export async function getSeriesDetails(seriesName: string, token?: string) {
  const query = `
      query SearchSeries($name: String!) {
      search(
          query: $name,
          query_type: "Series",
          per_page: 7,
          page: 1
      ) {
          results
      }
  }
  `;

  try {
    const data = await queryHardcover({
      query,
      variables: { name: seriesName },
    });

    console.log("📚 Series details fetched:", data.series?.name);
    return data.series;
  } catch (error) {
    console.error(
      "❌ Failed to fetch series details for name:",
      seriesName,
      error
    );
    return null;
  }
}

/**
 * Find the position of a book within its series
 */
export async function findBookPositionInSeries(
  bookId: number,
  seriesName: string,
  token?: string
): Promise<number | null> {
  try {
    const series = await getSeriesDetails(seriesName, token);

    if (!series || !series.books) {
      console.warn("⚠️ No series data or books found");
      return null;
    }

    // Find the book in the series
    const bookInSeries = series.books.find((book: any) => book.id === bookId);

    if (bookInSeries && bookInSeries.position) {
      console.log(`✅ Found book position in series: ${bookInSeries.position}`);
      return bookInSeries.position;
    }

    // Fallback: find by index if position is not set
    const bookIndex = series.books.findIndex((book: any) => book.id === bookId);
    if (bookIndex !== -1) {
      const position = bookIndex + 1;
      console.log(`✅ Found book at index ${bookIndex}, position: ${position}`);
      return position;
    }

    console.warn("⚠️ Book not found in series");
    return null;
  } catch (error) {
    console.error("❌ Failed to find book position in series:", error);
    return null;
  }
}
