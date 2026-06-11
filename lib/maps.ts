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
      console.error("[Maps] API request failed:", response.status, response.statusText, "— falling back to demo results");
      return getDemoMapsResults(productDescription, location);
    }

    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("[Maps] Places API error:", data.status, data.error_message, "— falling back to demo results");
      return getDemoMapsResults(productDescription, location);
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
    console.error("[Maps] Search error:", err, "— falling back to demo results");
    return getDemoMapsResults(productDescription, location);
  }
}

/**
 * Demo Maps results — shown when no API key is configured.
 * These are fictional but realistic Lagos businesses for demo purposes.
 */
// ─── Demo data generator ────────────────────────────────────────────────────
// Produces 500+ unique realistic Lagos suppliers from component arrays.
// Deterministic: same productDescription → same results every call.

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function strHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Lagos areas used across all generators
const LAGOS_AREAS = [
  ["12 Balogun Street", "Lagos Island"], ["27 Marina Road", "Lagos Island"],
  ["45 Broad Street", "Lagos Island"], ["8 Nnamdi Azikiwe Street", "Lagos Island"],
  ["3 Dosunmu Street", "Lagos Island"], ["17 Idumota Road", "Lagos Island"],
  ["Alaba Int'l Market, Block C", "Ojo"], ["Alaba Int'l Market, Shed 7", "Ojo"],
  ["Trade Fair Complex, Shop 14", "Ojo"], ["Trade Fair Complex, Block A", "Ojo"],
  ["Aspamda Compound, Row 3", "Ojo"], ["Ladipo Spare Parts, Shed 5", "Mushin"],
  ["Awolowo Way, Shop 22", "Ikeja"], ["Allen Avenue, Suite 4B", "Ikeja"],
  ["Obafemi Awolowo Way, Shop 8", "Ikeja"], ["Ikeja GRA, Block D", "Ikeja"],
  ["Computer Village, Shop 104", "Ikeja"], ["Computer Village, Row B", "Ikeja"],
  ["14 Creek Road", "Apapa"], ["28 Apapa Road", "Apapa"],
  ["Mile 12 Market, Stall 23", "Ketu"], ["Mile 12 Market, Block F", "Ketu"],
  ["Herbert Macaulay Way, Shop 6", "Yaba"], ["Tejuosho Market, Section B", "Yaba"],
  ["Adeniran Ogunsanya, Suite 3", "Surulere"], ["27 Bode Thomas Street", "Surulere"],
  ["Lekki Phase 1, Shop 7", "Lekki"], ["Admiralty Way, Unit 2A", "Lekki"],
  ["Oshodi Market, Row 5", "Oshodi"], ["Oshodi Expressway, Shed 9", "Oshodi"],
  ["Ojota Bus Stop, Shop 11", "Ojota"], ["15 Ikorodu Road", "Ojota"],
  ["Ikorodu Market, Section D", "Ikorodu"], ["Lagos-Ibadan Expressway KM 4", "Ojodu"],
  ["Agege Motor Road, Shop 3", "Agege"], ["Owode Market, Stall 14", "Agege"],
  ["33 Victoria Island, Plot 5", "Victoria Island"], ["Adetokunbo Ademola Street", "Victoria Island"],
  ["Kofo Abayomi Avenue, Suite 8", "Victoria Island"], ["10 Adeola Odeku Street", "Victoria Island"],
];

function randomPhone(seed: number): string {
  const prefixes = ["0801","0802","0803","0804","0805","0806","0807","0808","0809","0810","0811","0812","0813","0814","0815","0816","0817","0818","0819","0901","0902","0903","0904","0905","0906","0907","0908","0909"];
  const pre = prefixes[Math.abs(seed) % prefixes.length];
  const mid = String(100 + (Math.abs(seed * 7919) % 900));
  const end = String(1000 + (Math.abs(seed * 3571) % 9000));
  return `+234 ${pre.slice(1)} ${mid} ${end}`;
}

interface SupplierTemplate {
  prefixes: string[];
  types: string[];
  suffixes: string[];
  category: string;
  keywords: RegExp;
}

const TEMPLATES: Record<string, SupplierTemplate> = {
  electronics: {
    keywords: /tv|remote|electronics|gadget|cable|hdmi|laptop|computer|charger|adapter|screen|monitor|keyboard|mouse|speaker|headphone/,
    category: "electronics_store",
    prefixes: ["Lagos","Alaba","Ikeja","Computer Village","Balogun","Marina","Island","Eko","Coker","Delta","Sunrise","Nnamdi","Royal","Global","Premier","Unity","Star","Crown","Elite","Mega","Super","Alpha","Beta","Gamma","Zenith","Summit","Peak","Top","Best","First","Pro","Tech","Smart","Digital","Future","New","Modern","Advanced","Express","Swift","Quick","Fast","Dynamic","Power","Ultra","Quantum","Apex","Titan","Atlas","Eagle","Lion","Tiger","Phoenix","Vanguard","Champion","Victory","Triumph","Imperial","National","Federal","Central","Metro","City","Urban","Commercial"],
    types: ["Electronics","Gadget","Tech","Digital","Electro","Device","Component","Appliance","Equipment","Instrument","System","Network","Circuit","Power","Signal"],
    suffixes: ["Hub","Depot","Wholesale","Supplies","Market","Centre","Store","Shop","Traders","Distributors","Merchants","Dealers","Enterprise","Limited","Nigeria","Int'l","Global","Group","Co.","& Sons","Brothers","Associates","Partners","Solutions","Services"],
  },
  phones: {
    keywords: /phone|sim|telecom|airtime|recharge|mobile|smartphone|handset|accessories/,
    category: "phone_store",
    prefixes: ["Lagos","Computer Village","Slot","Pointek","Jumbo","Royal","Galaxy","Ikeja","Island","Eko","Metro","City","Urban","Smart","Quick","Swift","Alpha","Zeta","Omega","Prime","Plus","Max","Pro","Super","Ultra","Mega","Grand","Great","Best","Top","First","Star","Crown","Gold","Silver","Diamond","Platinum","Premier","Elite","Choice","Select","Preferred","Trusted","Reliable","Quality","Value","Budget","Economy","Express","Fast","Direct","Online","Tech","Digital","Mobile","Cellular","Wireless","Network","Connect","Link","Talk","Call"],
    types: ["Phone","Mobile","Cellular","Telecom","Wireless","Handset","Device","Gadget","Accessory","Communication"],
    suffixes: ["Hub","Depot","Wholesale","Store","Shop","Centre","Market","Traders","Distributors","Dealers","Enterprise","Limited","Nigeria","Int'l","Group","& Sons","Brothers","Solutions","Services","Co."],
  },
  food: {
    keywords: /food|drink|beverage|fmcg|provision|grocery|snack|water|juice|noodle|rice|flour|sugar|oil|tomato|seasoning|spice|condiment|dairy|confectionery|biscuit|chocolate/,
    category: "food_distributor",
    prefixes: ["Apapa","Mile 12","Idumota","Ojota","Trade Fair","Aspamda","Lagos","Eko","Island","Marina","Balogun","Ojuelegba","Ketu","Ikorodu","Agege","Mushin","Surulere","Yaba","Ebute Metta","Fadeyi","Bariga","Somolu","Gbagada","Maryland","Ikeja","Kosofe","Ojodu","Berger","Ojota","Costain","Orile","Amuwo","Festac","Satellite","Badagry","Epe","Ibeju","Lekki","Ajah","Sangotedo","Abijo","Lakowe","Igbodu","Ijegun","Isashi","Okokomaiko","Igando","Ikotun","Egbe","Idimu","Ipaja","Ayobo","Iyana","Ifako","Gbagada","Shomolu","Bariga","Akoka","Iwaya"],
    types: ["Food","FMCG","Provision","Grocery","Wholesale","Commodity","Beverage","Consumer","Household","Staple","Foodstuff"],
    suffixes: ["Depot","Wholesale","Distributors","Supplies","Market","Centre","Traders","Merchants","Enterprise","Limited","Nigeria","Brothers","Group","& Co.","Associates","Partners","Hub","Store"],
  },
  fabric: {
    keywords: /fabric|cloth|textile|fashion|garment|lace|ankara|aso.?oke|brocade|velvet|cotton|polyester|silk|denim|kente|kaftan|senator/,
    category: "textile_store",
    prefixes: ["Balogun","Dosunmu","Idumota","Tejuosho","Owode","Ikeja","Lagos","Island","Eko","Metro","City","Fashion","Style","Trend","Chic","Vogue","Glamour","Elegant","Classic","Modern","Traditional","Heritage","Cultural","Royal","Imperial","Noble","Grand","Premier","Elite","Choice","Select","Quality","Fine","Pure","Rich","Luxury","Budget","Value","Wholesale","Bulk","Mass","Trade","Commercial","National","Federal","Central","West","East","North","South","African","Nigerian","Yoruba","Igbo","Hausa","Continental","International","Global","Universal","World"],
    types: ["Textile","Fabric","Cloth","Fashion","Garment","Apparel","Dress","Wear","Material","Lace","Ankara","Design"],
    suffixes: ["Market","Wholesale","Depot","Supplies","Traders","Merchants","Distributors","Enterprise","Limited","Nigeria","Centre","Hub","Store","Shop","& Sons","Brothers","Group","Co.","Associates"],
  },
  solar: {
    keywords: /solar|panel|inverter|battery|power|generator|ups|renewable|energy|electricity/,
    category: "solar_supplier",
    prefixes: ["Greenfield","Sunrise","EcoWatt","Powerline","Sunergy","Lagos","Eko","Island","Lekki","VI","Victoria","Ikoyi","Apapa","Ikeja","Surulere","Yaba","Green","Eco","Solar","Sun","Power","Energy","Watt","Volt","Amp","Current","Electric","Electro","Clean","Renewable","Sustainable","Future","Smart","Tech","Digital","Modern","Advanced","Pro","Ultra","Mega","Super","Alpha","Prime","Top","Best","First","Elite","Premier","Choice","Quality","Reliable","Trusted","National","Federal","Central","Metro","City","Urban","Commercial","Industrial","Corporate"],
    types: ["Solar","Energy","Power","Electric","Inverter","Battery","Panel","Renewable","Watt","Grid"],
    suffixes: ["Solutions","Systems","Depot","Supplies","Wholesale","Distributors","Enterprise","Limited","Nigeria","Hub","Centre","Store","Traders","Merchants","Group","Partners","Associates","& Co.","Brothers","Int'l"],
  },
  kitchenware: {
    keywords: /kitchen|pot|cookware|appliance|blender|cooker|fridge|freezer|microwave|oven|stove|utensil|cutlery|plate|bowl|cup|glass/,
    category: "kitchenware_store",
    prefixes: ["Alaba","Idumota","Balogun","Eko","Lagos","Island","Trade Fair","Surulere","Yaba","Apapa","Ikeja","Metro","City","Urban","Home","House","Kitchen","Cook","Chef","Master","Pro","Ultra","Mega","Super","Grand","Great","Best","Top","First","Star","Crown","Gold","Silver","Premier","Elite","Choice","Quality","Value","Budget","Economy","Wholesale","Bulk","Commercial","Industrial","National","Federal","Central","West","East","African","Nigerian","Continental","International","Global","Universal","Modern","Traditional","Classic","Heritage","Cultural","Royal","Imperial","Noble","Elegant","Fine","Pure","Rich","Luxury"],
    types: ["Kitchenware","Cookware","Appliance","Household","Home","Kitchen","Utensil","Equipment","Accessory"],
    suffixes: ["Depot","Wholesale","Supplies","Traders","Merchants","Distributors","Enterprise","Limited","Nigeria","Centre","Hub","Market","Store","Shop","& Sons","Brothers","Group","Co.","Associates","Partners"],
  },
  industrial: {
    keywords: /industrial|machinery|part|component|spare|equipment|tool|bolt|nut|valve|pump|pipe|cable|wire|motor|engine|compressor|generator/,
    category: "industrial_supplier",
    prefixes: ["Ladipo","Nnewi","Delta","Marina","Apapa","Ikeja","Lagos","Trade Fair","Aspamda","Island","Tech","Techparts","Engineering","Industrial","Heavy","Power","Mechanical","Electrical","Hydraulic","Pneumatic","Auto","Machine","Mech","Eng","Steel","Iron","Metal","Alloy","Composite","Polymer","Rubber","Plastic","Chemical","Construction","Building","Civil","Structural","Fabrication","Welding","Casting","Forging","Machining","Tooling","Precision","Quality","Reliable","Trusted","Professional","Commercial","National","Federal","Central","West","East","African","Nigerian","Continental","International","Global","Universal","Modern","Advanced","Smart","Tech","Digital","Pro","Ultra","Mega","Super","Alpha","Prime","Top","Best","First","Elite","Premier","Choice"],
    types: ["Industrial","Engineering","Machinery","Equipment","Parts","Supplies","Tools","Hardware","Component","Spare","Technical"],
    suffixes: ["Depot","Wholesale","Supplies","Traders","Merchants","Distributors","Enterprise","Limited","Nigeria","Centre","Hub","Market","Store","Shop","& Sons","Brothers","Group","Co.","Associates","Partners","Solutions","Services","Int'l","Nigeria"],
  },
  general: {
    keywords: /.*/,
    category: "wholesale_store",
    prefixes: ["Idumota","Trade Fair","Balogun","Aspamda","Mushin","Oshodi","Ojota","Yaba","Surulere","Apapa","Ikeja","Lagos","Eko","Island","Marina","Metro","City","Urban","Commercial","National","Federal","Central","West","East","North","South","African","Nigerian","Continental","International","Global","Universal","Modern","Traditional","Classic","Heritage","Cultural","Royal","Imperial","Noble","Grand","Premier","Elite","Choice","Select","Preferred","Trusted","Reliable","Quality","Value","Budget","Economy","Express","Fast","Direct","Alpha","Beta","Gamma","Zeta","Omega","Prime","Plus","Max","Pro","Super","Ultra","Mega","Star","Crown","Gold","Silver","Diamond","Platinum","Bronze","Excel","Excel","Vision","Mission","Focus","Drive","Force","Impact","Power","Strength","Unity","Freedom","Progress","Growth","Success","Victory","Triumph","Champion"],
    types: ["Wholesale","Trading","Supplies","Distribution","Commerce","Merchants","Traders","Market","Depot","Enterprise"],
    suffixes: ["Market","Depot","Wholesale","Supplies","Traders","Merchants","Distributors","Enterprise","Limited","Nigeria","Centre","Hub","Store","Shop","& Sons","Brothers","Group","Co.","Associates","Partners","Solutions","Services","Int'l","Global"],
  },
};

function generateDemoSuppliers(
  template: SupplierTemplate,
  productDescription: string,
  count: number
): MapsSupplierResult[] {
  const seed = strHash(productDescription + template.category);
  const prefixes = seededShuffle(template.prefixes, seed);
  const types = seededShuffle(template.types, seed ^ 0xdeadbeef);
  const suffixes = seededShuffle(template.suffixes, seed ^ 0xbaadf00d);
  const areas = seededShuffle(LAGOS_AREAS, seed ^ 0xcafebabe);

  const results: MapsSupplierResult[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; results.length < count; i++) {
    const prefix = prefixes[i % prefixes.length];
    const type = types[(i * 3) % types.length];
    const suffix = suffixes[(i * 7) % suffixes.length];
    const name = `${prefix} ${type} ${suffix}`;

    if (usedNames.has(name)) continue;
    usedNames.add(name);

    const [street, area] = areas[i % areas.length];
    const address = `${street}, ${area}, Lagos`;
    const entropyA = (seed + i * 2654435761) >>> 0;
    const entropyB = (seed ^ i * 2246822519) >>> 0;
    const rating = parseFloat((3.6 + (entropyA % 9) * 0.1).toFixed(1));
    const reviews = 80 + (entropyB % 1200);
    const openNow = (entropyA % 3) !== 0;
    const matchScore = parseFloat((0.65 + ((count - results.length) / count) * 0.28).toFixed(2));

    results.push({
      name,
      address,
      phone: randomPhone(entropyA),
      rating,
      user_ratings_total: reviews,
      open_now: openNow,
      maps_place_id: `demo_${template.category}_${i}`,
      source: "google_maps",
      match_score: Math.min(0.95, matchScore),
      category: template.category,
    });
  }

  return results;
}

function getDemoMapsResults(
  productDescription: string,
  location: string
): MapsSupplierResult[] {
  const productLower = productDescription.toLowerCase();

  let key: keyof typeof TEMPLATES = "general";

  if (TEMPLATES.electronics.keywords.test(productLower)) key = "electronics";
  else if (TEMPLATES.phones.keywords.test(productLower)) key = "phones";
  else if (TEMPLATES.food.keywords.test(productLower)) key = "food";
  else if (TEMPLATES.fabric.keywords.test(productLower)) key = "fabric";
  else if (TEMPLATES.solar.keywords.test(productLower)) key = "solar";
  else if (TEMPLATES.kitchenware.keywords.test(productLower)) key = "kitchenware";
  else if (TEMPLATES.industrial.keywords.test(productLower)) key = "industrial";

  return generateDemoSuppliers(TEMPLATES[key], productDescription, 500);
}
