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

// /**
//  * Get the appropriate Hardcover API endpoint based on platform
//  * Web uses Supabase Edge Function proxy to avoid CORS
//  * Native uses direct API call
//  */
// function getHardcoverEndpoint(): string {
//   const isWeb = Platform.OS === "web";

//   if (isWeb) {
//     const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
//     if (!supabaseUrl) {
//       console.error("❌ EXPO_PUBLIC_SUPABASE_URL not configured");
//       throw new Error("Supabase URL not configured");
//     }
//     return `${supabaseUrl}/functions/v1/hardcover-proxy`;
//   }

//   return "https://api.hardcover.app/v1/graphql";
// }

/**
 * Get the appropriate endpoint based on platform
 * Web uses Supabase Edge Function proxy to avoid CORS
 * Native uses direct API call
 */
function getHardcoverEndpoint(): string {
  const isWeb = Platform.OS === "web";

  if (isWeb) {
    // Use Supabase Edge Function proxy for web to avoid CORS
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return "https://api.hardcover.app/v1/graphql";
    }
    return `${supabaseUrl}/functions/v1/hardcover-proxy`;
  }

  // Native apps can call API directly (no CORS)
  return "https://api.hardcover.app/v1/graphql";
}

/**
 * Make a GraphQL query to Hardcover API
 * Uses Supabase Edge Function proxy on web to avoid CORS
 * Uses direct API call on native platforms
 */
export async function queryHardcover({
  query,
  variables = {},
}: HardcoverQueryOptions) {
  const isWeb = Platform.OS === "web";
  const endpoint = getHardcoverEndpoint();

  try {
    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // For web (using Supabase proxy), add Supabase auth headers
    if (isWeb) {
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseAnonKey) {
        throw new Error("Supabase anon key not configured");
      }
      headers["apikey"] = supabaseAnonKey;
      headers["Authorization"] = `Bearer ${supabaseAnonKey}`;
    }
    // For native, add Hardcover token directly
    else {
      if (!token) {
        throw new Error("Hardcover API token not configured");
      }
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hardcover API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(
        `GraphQL errors: ${data.errors.map((e: any) => e.message).join(", ")}`
      );
    }

    return data.data;
  } catch (error) {
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

  // Hardcover API structure: results.hits contains the actual array of books
  if (results.hits && Array.isArray(results.hits)) {
    return results.hits;
  }

  // Fallback: if hits is not found, return empty array
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

    return data.series;
  } catch (error) {
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
      return null;
    }

    // Find the book in the series
    const bookInSeries = series.books.find((book: any) => book.id === bookId);

    if (bookInSeries && bookInSeries.position) {
      return bookInSeries.position;
    }

    // Fallback: find by index if position is not set
    const bookIndex = series.books.findIndex((book: any) => book.id === bookId);
    if (bookIndex !== -1) {
      const position = bookIndex + 1;
      return position;
    }

    return null;
  } catch (error) {
    return null;
  }
}
