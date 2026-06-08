/**
 * Google Maps Places API — Text Search
 * Used when the supplier DB has < 3 results (cold start / new users)
 *
 * API: Places API (New) — Text Search
 * Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
 * Cost: Free within $200/month Google Maps credit (~10,000 calls/month)
 */

export interface MapsSupplierResult {
  name: string;
  address: string;
  phone?: string;
  rating: number;
  user_ratings_total: number;
  open_now: boolean;
  maps_place_id: string;
  source: "google_maps";
  match_score: number;
  category?: string;
  website?: string;
}

/**
 * Build an intelligent Maps search query from disruption context.
 * Example: "TV remotes, Lagos Island" → "electronics wholesaler Lagos Island"
 */
export function buildMapsQuery(productDescription: string, location: string): string {
  const productLower = productDescription.toLowerCase();

  let category = "supplier wholesale";
  if (/tv|remote|electronics|gadget|cable|hdmi|phone|laptop|computer/.test(productLower)) {
    category = "electronics wholesaler";
  } else if (/food|drink|beverage|fmcg|provision|grocery|snack/.test(productLower)) {
    category = "food distributor wholesale";
  } else if (/fabric|cloth|textile|fashion|garment/.test(productLower)) {
    category = "fabric textile wholesale";
  } else if (/solar|panel|inverter|battery|power/.test(productLower)) {
    category = "solar equipment supplier";
  } else if (/kitchen|pot|cookware|appliance/.test(productLower)) {
    category = "kitchenware wholesale";
  } else if (/phone|telecom|sim|accessory/.test(productLower)) {
    category = "phone accessories wholesale";
  } else if (/industrial|machinery|part|component/.test(productLower)) {
    category = "industrial parts supplier";
  }

  return `${category} ${location}`.trim();
}

/**
 * Search Google Maps Places API for real businesses matching the query.
 * Falls back to empty array if API key is not configured.
 */
export async function searchMapsSuppliers(
  productDescription: string,
  location = "Lagos, Nigeria",
  minRating = 3.5,
  maxResults = 5
): Promise<MapsSupplierResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === "your_google_maps_api_key_here") {
    console.log("[Maps] API key not configured — returning demo results");
    return getDemoMapsResults(productDescription, location);
  }

  const query = buildMapsQuery(productDescription, location);

  try {
    // Use legacy Text Search (works with any Maps API key, no special setup)
    const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    url.searchParams.set("query", query);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("region", "ng"); // Nigeria
    url.searchParams.set("type", "store");

    const response = await fetch(url.toString(), {
      next: { revalidate: 0 }, // no caching — always fresh
    });

    if (!response.ok) {
      console.error("[Maps] API request failed:", response.status, response.statusText);
      return [];
    }

    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("[Maps] Places API error:", data.status, data.error_message);
      return [];
    }

    const results: MapsSupplierResult[] = [];

    for (const place of (data.results || []).slice(0, maxResults * 2)) {
      const rating = place.rating || 0;
      if (rating < minRating) continue;

      // Convert Google rating (1–5) to a match score (0–1)
      const matchScore = Math.min(0.85, (rating / 5) * 0.9);

      results.push({
        name: place.name,
        address: place.formatted_address || place.vicinity || "",
        rating: place.rating || 0,
        user_ratings_total: place.user_ratings_total || 0,
        open_now: place.opening_hours?.open_now ?? false,
        maps_place_id: place.place_id,
        source: "google_maps",
        match_score: matchScore,
        category: place.types?.[0] || "store",
      });

      if (results.length >= maxResults) break;
    }

    // Sort: open-now first, then by rating
    results.sort((a, b) => {
      if (a.open_now && !b.open_now) return -1;
      if (!a.open_now && b.open_now) return 1;
      return b.rating - a.rating;
    });

    return results;
  } catch (err) {
    console.error("[Maps] Search error:", err);
    return [];
  }
}

/**
 * Demo Maps results — shown when no API key is configured.
 * These are fictional but realistic Lagos businesses for demo purposes.
 */
function getDemoMapsResults(
  productDescription: string,
  location: string
): MapsSupplierResult[] {
  const productLower = productDescription.toLowerCase();

  const demoByCategory: Record<string, MapsSupplierResult[]> = {
    electronics: [
      {
        name: "Lagos Electronics Hub",
        address: "12 Balogun Street, Lagos Island, Lagos",
        phone: "+234 801 234 5678",
        rating: 4.3,
        user_ratings_total: 287,
        open_now: true,
        maps_place_id: "demo_place_001",
        source: "google_maps",
        match_score: 0.87,
        category: "electronics_store",
      },
      {
        name: "Alaba Int'l Market Hub",
        address: "Alaba International Market, Ojo, Lagos",
        rating: 4.1,
        user_ratings_total: 512,
        open_now: true,
        maps_place_id: "demo_place_002",
        source: "google_maps",
        match_score: 0.82,
        category: "electronics_store",
      },
    ],
    food: [
      {
        name: "Apapa Wholesale Foods",
        address: "14 Creek Road, Apapa, Lagos",
        rating: 4.0,
        user_ratings_total: 143,
        open_now: true,
        maps_place_id: "demo_place_010",
        source: "google_maps",
        match_score: 0.80,
        category: "food",
      },
      {
        name: "Trade Fair FMCG Depot",
        address: "International Trade Fair Complex, Ojo, Lagos",
        rating: 3.9,
        user_ratings_total: 209,
        open_now: true,
        maps_place_id: "demo_place_011",
        source: "google_maps",
        match_score: 0.78,
        category: "food",
      },
    ],
    general: [
      {
        name: `${location.split(",")[0]} Wholesale Market`,
        address: `Central Market, ${location}`,
        rating: 4.0,
        user_ratings_total: 198,
        open_now: true,
        maps_place_id: "demo_place_020",
        source: "google_maps",
        match_score: 0.79,
        category: "store",
      },
      {
        name: "Trade Fair Wholesale Complex",
        address: "International Trade Fair, Lagos",
        rating: 3.8,
        user_ratings_total: 445,
        open_now: true,
        maps_place_id: "demo_place_021",
        source: "google_maps",
        match_score: 0.76,
        category: "store",
      },
    ],
  };

  if (/tv|remote|electronics|gadget|cable|phone|laptop/.test(productLower)) {
    return demoByCategory.electronics;
  }
  if (/food|drink|beverage|fmcg|provision/.test(productLower)) {
    return demoByCategory.food;
  }
  return demoByCategory.general;
}
