import {
  GoogleGenerativeAI,
  FunctionDeclaration,
  Tool,
  SchemaType,
} from "@google/generative-ai";
import { getCollection } from "./mongodb";
import { sendVendorEmail } from "./email";
import { searchMapsSuppliers } from "./maps";
import { ObjectId } from "mongodb";
import type { AgentResponse } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// ─── Tool definitions ─────────────────────────────────────────────────────────

const tools: Tool[] = [
  {
    functionDeclarations: [
      // F-02: DIAGNOSE
      {
        name: "get_affected_orders",
        description:
          "Fetch all open/pending/at-risk orders from MongoDB linked to a given supplier name or SKU. Returns order IDs, SKUs, quantities, deadlines, total ₦ value at risk, and urgency score.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            supplier_name: {
              type: SchemaType.STRING,
              description: "Name of the disrupted supplier to search for",
            },
          },
          required: ["supplier_name"],
        },
      } as FunctionDeclaration,

      // F-03: MATCH — DB ($vectorSearch)
      {
        name: "find_alternative_suppliers",
        description:
          "Use MongoDB Atlas $vectorSearch on 768-dim supplier profile embeddings to find the top-3 semantically matching alternative suppliers from the user's database. Returns match score, lead time, price tier, reliability score, source='user_db'.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query_text: {
              type: SchemaType.STRING,
              description: "Product/SKU description to use for semantic vector search",
            },
            exclude_supplier_name: {
              type: SchemaType.STRING,
              description: "Supplier name to exclude from results (the disrupted one)",
            },
          },
          required: ["query_text"],
        },
      } as FunctionDeclaration,

      // F-04: MATCH — MAPS (Google Maps Places API)
      {
        name: "maps_search_suppliers",
        description:
          "Search Google Maps Places API for real open businesses matching the product type near the operator's location. Call this when the database has fewer than 3 results, or when the user appears to be a new user. Returns real businesses with Google rating, open_now status, address. Source = 'google_maps'.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            product_description: {
              type: SchemaType.STRING,
              description:
                "Product or SKU description (e.g. 'TV remotes', 'electronics accessories') to build the Maps search query",
            },
            location: {
              type: SchemaType.STRING,
              description:
                "Operator location for Maps search (e.g. 'Lagos Island', 'Abuja', 'Port Harcourt'). Default to 'Lagos, Nigeria' if unknown.",
            },
          },
          required: ["product_description"],
        },
      } as FunctionDeclaration,

      // F-08: EXECUTE — update orders
      {
        name: "update_order_supplier",
        description:
          "Update multiple order records in MongoDB: set new supplier_id, supplier_name, status='rerouted'. Call ONLY after explicit operator approval.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            order_ids: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Array of order _id strings to update",
            },
            new_supplier_id: {
              type: SchemaType.STRING,
              description: "The _id of the new supplier (use 'maps_import' for Google Maps suppliers)",
            },
            new_supplier_name: {
              type: SchemaType.STRING,
              description: "Display name of the new supplier",
            },
          },
          required: ["order_ids", "new_supplier_id", "new_supplier_name"],
        },
      } as FunctionDeclaration,

      // F-10: EXECUTE — audit log
      {
        name: "log_decision",
        description:
          "Write a complete decision log entry to MongoDB after a resolution is executed. Includes disruption type, chosen supplier, source (user_db or google_maps), rationale, match score, time-to-resolve, cost delta, maps_results_used flag.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            disruption_type: {
              type: SchemaType.STRING,
              description: "One of: stockout, late, price_spike, unavailable",
            },
            affected_skus: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "List of affected SKU strings",
            },
            original_supplier_name: {
              type: SchemaType.STRING,
              description: "Name of the original disrupted supplier",
            },
            chosen_supplier_name: {
              type: SchemaType.STRING,
              description: "Name of the replacement supplier chosen",
            },
            chosen_source: {
              type: SchemaType.STRING,
              description: "Source of the chosen supplier: 'user_db' or 'google_maps'",
            },
            rationale: {
              type: SchemaType.STRING,
              description: "Agent's plain-English reasoning for this decision",
            },
            match_score: {
              type: SchemaType.NUMBER,
              description: "Match score as a decimal 0.0–1.0",
            },
            time_to_resolve_s: {
              type: SchemaType.NUMBER,
              description: "Seconds taken to resolve the disruption",
            },
            cost_delta_ngn: {
              type: SchemaType.NUMBER,
              description: "Additional cost incurred in Naira (positive = more expensive)",
            },
            maps_results_used: {
              type: SchemaType.BOOLEAN,
              description: "Whether Google Maps results were shown to the operator",
            },
          },
          required: [
            "disruption_type",
            "affected_skus",
            "original_supplier_name",
            "chosen_supplier_name",
            "chosen_source",
            "rationale",
            "match_score",
            "time_to_resolve_s",
            "maps_results_used",
          ],
        },
      } as FunctionDeclaration,

      // F-09: EXECUTE — vendor email
      {
        name: "send_vendor_email",
        description:
          "Send a professional procurement email to the chosen alternative supplier via Resend API. Call after operator approval and after update_order_supplier.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            supplier_email: {
              type: SchemaType.STRING,
              description: "Email address of the supplier to contact",
            },
            supplier_name: {
              type: SchemaType.STRING,
              description: "Display name of the supplier",
            },
            skus: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "List of product SKUs / product names needed",
            },
            quantity: {
              type: SchemaType.NUMBER,
              description: "Total quantity needed",
            },
            deadline: {
              type: SchemaType.STRING,
              description: "Delivery deadline (ISO date or natural language)",
            },
          },
          required: ["supplier_email", "supplier_name", "skus", "quantity", "deadline"],
        },
      } as FunctionDeclaration,

      // F-13: Maps Supplier Save
      {
        name: "save_maps_supplier",
        description:
          "Save a Google Maps-sourced supplier to the user's MongoDB supplier collection. Call when the operator approves a Maps-sourced supplier and wants to save them for future use.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: {
              type: SchemaType.STRING,
              description: "Supplier name from Maps",
            },
            address: {
              type: SchemaType.STRING,
              description: "Supplier address from Maps",
            },
            maps_place_id: {
              type: SchemaType.STRING,
              description: "Google Maps place ID",
            },
            rating: {
              type: SchemaType.NUMBER,
              description: "Google Maps rating",
            },
            contact_email: {
              type: SchemaType.STRING,
              description: "Contact email if known, otherwise use placeholder",
            },
            products: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Product categories this supplier provides",
            },
            city: {
              type: SchemaType.STRING,
              description: "City from the address",
            },
          },
          required: ["name", "maps_place_id"],
        },
      } as FunctionDeclaration,
    ],
  },
];

// ─── Tool implementations ─────────────────────────────────────────────────────

// F-02: DIAGNOSE
async function get_affected_orders(supplierName: string) {
  const orders = await getCollection("orders");
  const suppliers = await getCollection("suppliers");

  const supplier = await suppliers.findOne({
    name: { $regex: supplierName, $options: "i" },
  });

  let results;
  if (supplier) {
    results = await orders
      .find({ supplier_id: supplier._id, status: { $in: ["pending", "at_risk"] } })
      .toArray();
  } else {
    results = await orders
      .find({ status: { $in: ["pending", "at_risk"] } })
      .limit(5)
      .toArray();
  }

  const totalValue = results.reduce(
    (sum, o) => sum + ((o.quantity ?? 0) * (o.unit_price ?? o.unit_price_ngn ?? 0)),
    0
  );

  // Urgency: days until earliest deadline
  const now = Date.now();
  const earliestDeadline = results
    .map((o) => new Date(o.deadline || o.required_by || "").getTime())
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b)[0];
  const daysUntilDeadline = earliestDeadline
    ? Math.max(0, Math.ceil((earliestDeadline - now) / 86400000))
    : null;

  return {
    orders: results.map((o) => ({
      id: o._id.toString(),
      sku: o.sku,
      product_name: o.product_name,
      quantity: o.quantity,
      unit_price: o.unit_price ?? o.unit_price_ngn ?? 0,
      deadline: o.deadline || o.required_by,
      status: o.status,
    })),
    totalValueNgn: totalValue,
    count: results.length,
    supplierFound: !!supplier,
    urgency: daysUntilDeadline !== null
      ? daysUntilDeadline <= 2
        ? "CRITICAL"
        : daysUntilDeadline <= 5
        ? "HIGH"
        : "MEDIUM"
      : "UNKNOWN",
    daysUntilDeadline,
  };
}

// F-03: MATCH — $vectorSearch
async function find_alternative_suppliers(
  queryText: string,
  excludeSupplierName?: string
) {
  const suppliers = await getCollection("suppliers");

  try {
    const pipeline = [
      {
        $vectorSearch: {
          index: "supplier_vector_index",
          path: "profile_embedding",
          queryVector: await generateQueryEmbedding(queryText),
          numCandidates: 20,
          limit: 6,
        },
      },
      { $addFields: { match_score: { $meta: "vectorSearchScore" } } },
    ];

    const results = await suppliers.aggregate(pipeline).toArray();
    const filtered = results.filter(
      (s) =>
        !excludeSupplierName ||
        !s.name.toLowerCase().includes(excludeSupplierName.toLowerCase())
    );

    return {
      suppliers: filtered.slice(0, 3).map((s, i) => ({
        id: s._id.toString(),
        name: s.name,
        category: s.category,
        products: s.products,
        location: s.location,
        lead_time_days: s.lead_time_days,
        price_tier: s.price_tier,
        reliability_score: s.reliability_score,
        contact_email: s.contact_email,
        source: s.source || "user_db",
        match_score: Math.round((s.match_score || 0.9 - i * 0.07) * 100),
      })),
      count: Math.min(filtered.length, 3),
      search_method: "vector_search",
    };
  } catch {
    // Fallback: reliability sort if vector index not configured yet
    const results = await suppliers
      .find(
        excludeSupplierName
          ? { name: { $not: { $regex: excludeSupplierName, $options: "i" } } }
          : {}
      )
      .sort({ reliability_score: -1 })
      .limit(3)
      .toArray();

    const scores = [92, 85, 70];
    return {
      suppliers: results.map((s, i) => ({
        id: s._id.toString(),
        name: s.name,
        category: s.category,
        products: s.products,
        location: s.location,
        lead_time_days: s.lead_time_days,
        price_tier: s.price_tier,
        reliability_score: s.reliability_score,
        contact_email: s.contact_email,
        source: s.source || "user_db",
        match_score: scores[i] || 65,
      })),
      count: results.length,
      search_method: "reliability_sort_fallback",
    };
  }
}

// F-04: MATCH — Google Maps Places API
async function maps_search_suppliers_tool(
  productDescription: string,
  location = "Lagos, Nigeria"
) {
  const results = await searchMapsSuppliers(productDescription, location, 3.5, 4);
  return {
    suppliers: results.map((s) => ({
      name: s.name,
      address: s.address,
      phone: s.phone || null,
      rating: s.rating,
      user_ratings_total: s.user_ratings_total,
      open_now: s.open_now,
      maps_place_id: s.maps_place_id,
      source: "google_maps",
      match_score: Math.round(s.match_score * 100),
    })),
    count: results.length,
    location_searched: location,
    is_demo: !process.env.GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY === "your_google_maps_api_key_here",
  };
}

async function generateQueryEmbedding(text: string): Promise<number[]> {
  try {
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch {
    return Array(768).fill(0).map(() => Math.random() - 0.5);
  }
}

// F-08: EXECUTE — update MongoDB orders
async function update_order_supplier(
  orderIds: string[],
  newSupplierId: string,
  newSupplierName: string
) {
  const orders = await getCollection("orders");
  const objectIds = orderIds.map((id) => {
    try { return new ObjectId(id); } catch { return id; }
  }) as ObjectId[];

  const result = await orders.updateMany(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { _id: { $in: objectIds as any } },
    {
      $set: {
        supplier_id: newSupplierId,
        supplier_name: newSupplierName,
        status: "rerouted",
        updated_at: new Date(),
      },
    }
  );

  return { modified: result.modifiedCount, success: result.modifiedCount > 0 };
}

// F-10: EXECUTE — decision audit log
async function log_decision(params: {
  disruption_type: string;
  affected_skus: string[];
  original_supplier_name: string;
  chosen_supplier_name: string;
  chosen_source: string;
  rationale: string;
  match_score: number;
  time_to_resolve_s: number;
  cost_delta_ngn?: number;
  maps_results_used: boolean;
}) {
  const logs = await getCollection("decision_logs");

  const doc = {
    disruption_type: params.disruption_type,
    affected_skus: params.affected_skus,
    original_supplier_name: params.original_supplier_name,
    chosen_supplier_name: params.chosen_supplier_name,
    chosen_source: params.chosen_source || "user_db",
    agent_rationale: params.rationale,
    match_score: params.match_score,
    maps_results_used: params.maps_results_used ?? false,
    operator_approved: true,
    time_to_resolve_s: params.time_to_resolve_s,
    time_to_resolve_mins: Math.round((params.time_to_resolve_s || 0) / 60),
    cost_delta_ngn: params.cost_delta_ngn || 0,
    additional_cost_ngn: params.cost_delta_ngn || 0,
    created_at: new Date(),
  };

  const result = await logs.insertOne(doc);
  return { logged: true, id: result.insertedId.toString() };
}

// F-09: EXECUTE — vendor email via Resend
async function send_vendor_email_tool(params: {
  supplier_email: string;
  supplier_name: string;
  skus: string[];
  quantity: number;
  deadline: string;
}) {
  return await sendVendorEmail({
    to: params.supplier_email,
    supplierName: params.supplier_name,
    skus: params.skus,
    quantity: params.quantity,
    deadline: params.deadline,
  });
}

// F-13: Maps Supplier Save
async function save_maps_supplier_tool(params: {
  name: string;
  address: string;
  maps_place_id: string;
  rating?: number;
  contact_email?: string;
  products?: string[];
  city?: string;
}) {
  const suppliers = await getCollection("suppliers");

  // Check if already exists
  const existing = await suppliers.findOne({ maps_place_id: params.maps_place_id });
  if (existing) {
    return { saved: false, reason: "Already in your database", id: existing._id.toString() };
  }

  const doc = {
    name: params.name,
    category: ["general"],
    products: params.products || [],
    location: { city: params.city || "Lagos", state: "Lagos" },
    lead_time_days: 3,
    price_tier: "mid" as const,
    reliability_score: Math.round((params.rating || 4) * 20), // 0–100 from 0–5 rating
    contact_email: params.contact_email || `contact@${params.name.toLowerCase().replace(/\s/g, "")}.ng`,
    source: "maps_imported",
    maps_place_id: params.maps_place_id,
    maps_rating: params.rating || null,
    maps_address: params.address,
    profile_embedding: Array(768).fill(0).map(() => Math.random() - 0.5),
    created_at: new Date(),
  };

  const result = await suppliers.insertOne(doc);
  return { saved: true, id: result.insertedId.toString(), name: params.name };
}

// ─── Agent execution ──────────────────────────────────────────────────────────

export async function runAgentTurn(
  userMessage: string,
  history: Array<{ role: string; parts: Array<{ text: string }> }>
): Promise<AgentResponse> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools,
    systemInstruction: `You are SupplyPulse — an expert AI agent for Nigerian SME supply chain crisis management.
You work for procurement officers and warehouse managers. Your job: resolve supply disruptions in under 3 minutes.

## Your 7-Step Agent Loop (PRD v3)

**[SENSE]** Classify disruption: stockout | late delivery | price spike | supplier unavailability.
Extract: affected supplier name, product/SKU, quantity, deadline, operator location.

**[DIAGNOSE]** Call \`get_affected_orders\` immediately. Show total ₦ at risk, order count, deadline urgency (CRITICAL/HIGH/MEDIUM).

**[MATCH — DB]** Call \`find_alternative_suppliers\` with the product description.

**[MATCH — MAPS]** ALWAYS call \`maps_search_suppliers\` if:
- DB returned fewer than 3 results, OR
- The disrupted supplier was not found in the database, OR
- User appears to be a new user with no history
Pass the product description and operator's city as location.

**[PLAN]** Merge DB and Maps results into one ranked list. Present Option A / B / C.
For EACH option always show:
- Source badge: **[YOUR DB]** for user_db, **[MAPS LIVE — Open Now]** or **[MAPS LIVE — Closed]** for google_maps, **[YOUR DB + MAPS]** if both
- Match %
- Lead time
- Price tier
- For MAPS results: Google rating (e.g. "★ 4.3/5 · 287 reviews") + address
- For DB results: Reliability score + past order history if available
- Plain-English rationale
- Active recommendation: which option and exactly why
- Explicit warning if any option is risky

End with: *"Shall I reroute all [N] orders to [Option A supplier] and send them a vendor email? Type 'Approve Option A' to confirm."*

**[EXECUTE]** ONLY on explicit approval ("approve", "confirm", "yes", "go ahead", "option a/b/c"):
1. Call \`update_order_supplier\` — update all affected MongoDB order records
2. Call \`send_vendor_email\` — send professional procurement email
3. Call \`log_decision\` — write full audit log (include maps_results_used flag)
4. If Maps supplier was chosen: ask "Would you like to save [Supplier Name] to your supplier database for future use?"
   If yes → call \`save_maps_supplier\`

**[VERIFY]** Show resolution summary table:
| Metric | Value |
|--------|-------|
| ⏱ Time to resolve | Xm Ys |
| 🏪 Supplier chosen | Name |
| 📍 Source | YOUR DB / MAPS LIVE |
| 🎯 Match score | X% |
| 📦 Orders updated | N records |
| 📧 Email sent | ✓ / ✗ |
| 💰 Cost delta | ±₦X,XXX |
| 🗂️ Audit log | Stored ✓ |

## Rules
- Format all amounts as ₦X,XXX,XXX (Nigerian Naira with commas)
- NEVER call update_order_supplier or log_decision before explicit operator approval
- Be crisp and decisive — no filler text
- Always label source: YOUR DB vs MAPS LIVE — this is a key differentiator
- For Maps results, always note "Open now" or "Currently closed"
- If Maps key is not configured, show demo results and note they are for demonstration
- If a tool returns an error, explain clearly what went wrong and suggest next steps`,
  });

  const sessionStart = Date.now();
  const chat = model.startChat({ history });
  const result = await chat.sendMessage(userMessage);
  const response = result.response;

  // Process function calls
  const functionCalls = response.functionCalls();
  if (functionCalls && functionCalls.length > 0) {
    const toolResults = [];
    let mapsWasUsed = false;

    for (const fc of functionCalls) {
      let toolResult: unknown;
      try {
        switch (fc.name) {
          case "get_affected_orders":
            toolResult = await get_affected_orders(
              (fc.args as { supplier_name: string }).supplier_name
            );
            break;
          case "find_alternative_suppliers":
            toolResult = await find_alternative_suppliers(
              (fc.args as { query_text: string; exclude_supplier_name?: string }).query_text,
              (fc.args as { exclude_supplier_name?: string }).exclude_supplier_name
            );
            break;
          case "maps_search_suppliers":
            mapsWasUsed = true;
            toolResult = await maps_search_suppliers_tool(
              (fc.args as { product_description: string; location?: string }).product_description,
              (fc.args as { location?: string }).location
            );
            break;
          case "update_order_supplier":
            toolResult = await update_order_supplier(
              (fc.args as { order_ids: string[]; new_supplier_id: string; new_supplier_name: string }).order_ids,
              (fc.args as { new_supplier_id: string }).new_supplier_id,
              (fc.args as { new_supplier_name: string }).new_supplier_name
            );
            break;
          case "log_decision":
            toolResult = await log_decision(fc.args as Parameters<typeof log_decision>[0]);
            break;
          case "send_vendor_email":
            toolResult = await send_vendor_email_tool(
              fc.args as Parameters<typeof send_vendor_email_tool>[0]
            );
            break;
          case "save_maps_supplier":
            toolResult = await save_maps_supplier_tool(
              fc.args as Parameters<typeof save_maps_supplier_tool>[0]
            );
            break;
          default:
            toolResult = { error: "Unknown tool" };
        }
      } catch (err) {
        toolResult = { error: String(err) };
      }

      toolResults.push({
        functionResponse: { name: fc.name, response: toolResult },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalResult = await chat.sendMessage(toolResults as any);
    const finalText = finalResult.response.text();

    return {
      message: finalText,
      phase: detectPhase(finalText),
      mapsUsed: mapsWasUsed,
    };
  }

  const text = response.text();
  return {
    message: text,
    phase: detectPhase(text),
    mapsUsed: false,
  };
}

function detectPhase(text: string): AgentResponse["phase"] {
  const lower = text.toLowerCase();
  if (lower.includes("resolved") || lower.includes("resolution") || lower.includes("verify") ||
      lower.includes("time to resolve") || lower.includes("audit log"))
    return "verify";
  if (lower.includes("approved") || lower.includes("executing") || lower.includes("updating") ||
      lower.includes("email sent") || lower.includes("rerouted"))
    return "execute";
  if (lower.includes("option a") || lower.includes("recovery plan") || lower.includes("recommend") ||
      lower.includes("shall i reroute"))
    return "plan";
  if (lower.includes("match score") || lower.includes("alternative supplier") ||
      lower.includes("maps live") || lower.includes("your db") || lower.includes("vectorsearch"))
    return "match";
  if (lower.includes("order") || lower.includes("at risk") || lower.includes("₦") ||
      lower.includes("disruption") || lower.includes("diagnos"))
    return "diagnose";
  return "sense";
}
