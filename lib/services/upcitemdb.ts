import { supabase } from "@/lib/supabase";
import type { ItemCategory } from "lib/types";

const UPCITEMDB_TRIAL_URL = "https://api.upcitemdb.com/prod/trial/lookup";

export interface BarcodeLookupResult {
  barcode: string;
  title?: string;
  brand?: string;
  category: ItemCategory;
  rawCategory?: string;
  description?: string;
  images?: string[];
}

// Keyword hints drawn from UPCitemdb's free-text category paths (e.g.
// "Media > Books > Fiction", "Home & Garden > Kitchen & Dining"). Checked
// in order — first match wins. Not exhaustive; unmatched barcodes fall back
// to "other" and the user can pick a better category by hand.
const CATEGORY_KEYWORDS: { category: ItemCategory; keywords: string[] }[] = [
  { category: "book", keywords: ["book", "media > books", "textbook"] },
  {
    category: "electronics",
    keywords: [
      "electronics",
      "computers",
      "cell phones",
      "camera",
      "video game consoles",
      "audio",
      "television",
    ],
  },
  {
    category: "game",
    keywords: ["video games", "toys & games", "toy", "board game", "puzzle"],
  },
  {
    category: "clothing",
    keywords: ["clothing", "apparel", "shoes", "jewelry", "watches"],
  },
  {
    category: "kitchen",
    keywords: [
      "kitchen",
      "dining",
      "cookware",
      "bakeware",
      "food & beverage",
      "grocery",
    ],
  },
  {
    category: "sports",
    keywords: ["sports", "outdoors", "fitness", "exercise", "camping"],
  },
  {
    category: "tool",
    keywords: ["tools", "hardware", "home improvement", "power tool"],
  },
];

function guessCategory(rawCategory?: string, title?: string): ItemCategory {
  const haystack = `${rawCategory ?? ""} ${title ?? ""}`.toLowerCase();
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => haystack.includes(k))) return category;
  }
  return "other";
}

/**
 * Look up a scanned barcode: check our Supabase cache first, and only fall
 * back to UPCitemdb's free trial endpoint (unauthenticated, ~100
 * lookups/day per IP) on a miss. Successful external lookups are cached for
 * every future scan of the same barcode, by any user.
 */
export async function lookupBarcode(
  barcode: string,
): Promise<BarcodeLookupResult | null> {
  console.log("[upcitemdb] lookupBarcode:", JSON.stringify(barcode));

  const { data: cached, error: cacheError } = await supabase
    .from("barcode_lookups")
    .select("barcode, title, brand, category, description, images")
    .eq("barcode", barcode)
    .maybeSingle();

  if (cacheError) {
    console.log("[upcitemdb] cache lookup error:", cacheError);
  }

  if (cached) {
    console.log("[upcitemdb] cache hit:", JSON.stringify(cached));
    return {
      barcode: cached.barcode,
      title: cached.title ?? undefined,
      brand: cached.brand ?? undefined,
      category: (cached.category as ItemCategory) ?? "other",
      description: cached.description ?? undefined,
      images: (cached.images as string[] | null) ?? undefined,
    };
  }

  console.log("[upcitemdb] cache miss, calling UPCitemdb trial endpoint");
  const url = `${UPCITEMDB_TRIAL_URL}?upc=${encodeURIComponent(barcode)}`;
  console.log("[upcitemdb] request URL:", url);

  const response = await fetch(url);
  console.log("[upcitemdb] response status:", response.status);

  const bodyText = await response.text();
  console.log("[upcitemdb] response body:", bodyText);

  if (!response.ok) {
    console.log("[upcitemdb] non-OK response, returning null");
    return null;
  }

  const data = JSON.parse(bodyText);
  const item = data?.items?.[0];
  if (!item) {
    console.log("[upcitemdb] no items in response, returning null");
    return null;
  }

  const rawCategory: string | undefined = item.category || undefined;
  const category = guessCategory(rawCategory, item.title);
  const result: BarcodeLookupResult = {
    barcode,
    title: item.title || undefined,
    brand: item.brand || undefined,
    category,
    rawCategory,
    description: item.description || undefined,
    images: Array.isArray(item.images) ? item.images : undefined,
  };

  console.log("[upcitemdb] parsed result:", JSON.stringify(result));

  // Best-effort cache write — a failure here (e.g. duplicate race) shouldn't
  // block returning the result to the user.
  const { error: insertError } = await supabase.from("barcode_lookups").insert({
    barcode: result.barcode,
    title: result.title,
    brand: result.brand,
    category: result.category,
    description: result.description,
    images: result.images,
    raw_response: item,
  });
  if (insertError) {
    console.log("[upcitemdb] cache write error (non-fatal):", insertError);
  }

  return result;
}
