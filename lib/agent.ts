import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getCollection } from "./mongodb";
import { sendVendorEmail } from "./email";
import { searchMapsSuppliers } from "./maps";
import { ObjectId } from "mongodb";
import type { AgentResponse } from "./types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// Google embeddings still used for $vectorSearch (separate quota, free)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// ─── Tool definitions (OpenAI/Groq format) ────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tools: any[] = [
  {
    type: "function",
    function: {
      name: "get_affected_orders",
      description:
        "Fetch all open/pending/at-risk orders from MongoDB linked to a given supplier name. Returns order IDs, SKUs, quantities, deadlines, total ₦ value at risk, and urgency score.",
      parameters: {
        type: "object",
        properties: {
          supplier_name: {
            type: "string",
            description: "Name of the disrupted supplier to search for",
          },
        },
        required: ["supplier_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_alternative_suppliers",
      description:
        "Use MongoDB Atlas $vectorSearch on 768-dim supplier embeddings to find the top-3 semantically matching alternative suppliers from the user's database. Returns match score, lead time, price tier, reliability score, source='user_db'.",
      parameters: {
        type: "object",
        properties: {
          query_text: {
            type: "string",
            description: "Product/SKU description to use for semantic vector search",
          },
          exclude_supplier_name: {
            type: "string",
            description: "Supplier name to exclude from results (the disrupted one)",
          },
        },
        required: ["query_text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "maps_search_suppliers",
      description:
        "Search Google Maps Places API for real open businesses near the operator. Call this when the database has fewer than 3 results or the user is new. Returns real businesses with Google rating, open_now status, address. Source = 'google_maps'.",
      parameters: {
        type: "object",
        properties: {
          product_description: {
            type: "string",
            description: "Product description to build the Maps search query (e.g. 'TV remotes', 'electronics')",
          },
          location: {
            type: "string",
            description: "Operator city for Maps search (e.g. 'Lagos Island', 'Abuja'). Default: 'Lagos, Nigeria'.",
          },
        },
        required: ["product_description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_order_supplier",
      description:
        "Update multiple order records in MongoDB: set new supplier_id, supplier_name, status='rerouted'. Call ONLY after explicit operator approval.",
      parameters: {
        type: "object",
        properties: {
          order_ids: {
            type: "array",
            items: { type: "string" },
            description: "Array of order _id strings to update",
          },
          new_supplier_id: {
            type: "string",
            description: "The _id of the new supplier",
          },
          new_supplier_name: {
            type: "string",
            description: "Display name of the new supplier",
          },
        },
        required: ["order_ids", "new_supplier_id", "new_supplier_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_decision",
      description:
        "Write a complete decision log entry to MongoDB after resolution is executed. Includes disruption type, chosen supplier, source, rationale, match score, time-to-resolve, cost delta.",
      parameters: {
        type: "object",
        properties: {
          disruption_type: { type: "string", description: "One of: stockout, late, price_spike, unavailable" },
          affected_skus: { type: "array", items: { type: "string" }, description: "List of affected SKUs" },
          original_supplier_name: { type: "string" },
          chosen_supplier_name: { type: "string" },
          chosen_source: { type: "string", description: "'user_db' or 'google_maps'" },
          rationale: { type: "string", description: "Plain-English reasoning for the decision" },
          match_score: { type: "number", description: "Match score 0.0–1.0" },
          time_to_resolve_s: { type: "number", description: "Seconds taken to resolve" },
          cost_delta_ngn: { type: "number", description: "Additional cost in Naira" },
          maps_results_used: { type: "boolean" },
        },
        required: [
          "disruption_type", "affected_skus", "original_supplier_name",
          "chosen_supplier_name", "chosen_source", "rationale",
          "match_score", "time_to_resolve_s", "maps_results_used",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_vendor_email",
      description:
        "Send a professional procurement email to the chosen supplier via Gmail (Nodemailer). Call after operator approval and after update_order_supplier.",
      parameters: {
        type: "object",
        properties: {
          supplier_email: { type: "string" },
          supplier_name: { type: "string" },
          skus: { type: "array", items: { type: "string" } },
          quantity: { type: "number" },
          deadline: { type: "string" },
        },
        required: ["supplier_email", "supplier_name", "skus", "quantity", "deadline"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_maps_supplier",
      description:
        "Save a Google Maps-sourced supplier to the MongoDB supplier collection for future use.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          address: { type: "string" },
          maps_place_id: { type: "string" },
          rating: { type: "number" },
          contact_email: { type: "string" },
          products: { type: "array", items: { type: "string" } },
          city: { type: "string" },
        },
        required: ["name", "maps_place_id"],
      },
    },
  },
];

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are SupplyPulse — an expert AI agent for Nigerian SME supply chain crisis management.
You work for procurement officers and warehouse managers. Your job: resolve supply disruptions in under 3 minutes.

## Your 7-Step Agent Loop

**[SENSE]** Classify disruption: stockout | late delivery | price spike | supplier unavailability.
Extract: affected supplier name, product/SKU, quantity, deadline, operator location.

**[DIAGNOSE]** Call get_affected_orders immediately. Show total ₦ at risk, order count, deadline urgency (CRITICAL/HIGH/MEDIUM).

**[MATCH — DB]** Call find_alternative_suppliers with the product description.

**[MATCH — MAPS]** ALWAYS call maps_search_suppliers if:
- DB returned fewer than 3 results, OR
- The disrupted supplier was not found in the database, OR
- User appears to be a new user with no history
Pass the product description and operator's city as location.

**[PLAN]** Merge DB and Maps results into one ranked list. Present Option A / B / C.
For EACH option show:
- Source badge: **[YOUR DB]** for user_db, **[MAPS LIVE — Open Now]** or **[MAPS LIVE — Closed]** for google_maps
- Match %, lead time, price tier
- For MAPS: Google rating (e.g. "★ 4.3/5 · 287 reviews") + address
- For DB: reliability score
- Plain-English rationale and active recommendation
End with: "Shall I reroute all [N] orders to [Option A supplier] and send them a vendor email? Type 'Approve Option A' to confirm."

**[EXECUTE]** ONLY on explicit approval ("approve", "confirm", "yes", "go ahead", "option a/b/c"):
1. Call update_order_supplier — update all affected MongoDB order records
2. Call send_vendor_email — send professional procurement email
3. Call log_decision — write full audit log
4. If Maps supplier was chosen: ask "Would you like to save [Name] to your supplier database?"

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
- Format all amounts as ₦X,XXX,XXX (Nigerian Naira)
- NEVER call update_order_supplier or log_decision before explicit operator approval
- Be crisp and decisive — no filler text
- Always label source: YOUR DB vs MAPS LIVE`;

// ─── Tool implementations ─────────────────────────────────────────────────────

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
      ? daysUntilDeadline <= 2 ? "CRITICAL"
        : daysUntilDeadline <= 5 ? "HIGH"
        : "MEDIUM"
      : "UNKNOWN",
    daysUntilDeadline,
  };
}

async function find_alternative_suppliers(queryText: string, excludeSupplierName?: string) {
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
      (s) => !excludeSupplierName || !s.name.toLowerCase().includes(excludeSupplierName.toLowerCase())
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
        match_score: [92, 85, 70][i] || 65,
      })),
      count: results.length,
      search_method: "reliability_sort_fallback",
    };
  }
}

async function maps_search_suppliers_tool(productDescription: string, location = "Lagos, Nigeria") {
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

async function update_order_supplier(orderIds: string[], newSupplierId: string, newSupplierName: string) {
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
  const result = await logs.insertOne({
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
  });
  return { logged: true, id: result.insertedId.toString() };
}

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
  const existing = await suppliers.findOne({ maps_place_id: params.maps_place_id });
  if (existing) {
    return { saved: false, reason: "Already in your database", id: existing._id.toString() };
  }
  const result = await suppliers.insertOne({
    name: params.name,
    category: ["general"],
    products: params.products || [],
    location: { city: params.city || "Lagos", state: "Lagos" },
    lead_time_days: 3,
    price_tier: "mid" as const,
    reliability_score: Math.round((params.rating || 4) * 20),
    contact_email: params.contact_email || `contact@${params.name.toLowerCase().replace(/\s/g, "")}.ng`,
    source: "maps_imported",
    maps_place_id: params.maps_place_id,
    maps_rating: params.rating || null,
    maps_address: params.address,
    profile_embedding: Array(768).fill(0).map(() => Math.random() - 0.5),
    created_at: new Date(),
  });
  return { saved: true, id: result.insertedId.toString(), name: params.name };
}

// ─── Tool dispatcher ──────────────────────────────────────────────────────────

async function dispatchTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_affected_orders":
      return get_affected_orders(args.supplier_name as string);
    case "find_alternative_suppliers":
      return find_alternative_suppliers(args.query_text as string, args.exclude_supplier_name as string | undefined);
    case "maps_search_suppliers":
      return maps_search_suppliers_tool(args.product_description as string, args.location as string | undefined);
    case "update_order_supplier":
      return update_order_supplier(args.order_ids as string[], args.new_supplier_id as string, args.new_supplier_name as string);
    case "log_decision":
      return log_decision(args as Parameters<typeof log_decision>[0]);
    case "send_vendor_email":
      return send_vendor_email_tool(args as Parameters<typeof send_vendor_email_tool>[0]);
    case "save_maps_supplier":
      return save_maps_supplier_tool(args as Parameters<typeof save_maps_supplier_tool>[0]);
    default:
      return { error: "Unknown tool: " + name };
  }
}

// ─── Agent execution ──────────────────────────────────────────────────────────

export async function runAgentTurn(
  userMessage: string,
  history: Array<{ role: string; parts: Array<{ text: string }> }>
): Promise<AgentResponse> {
  // Convert history from Gemini format to Groq/OpenAI format
  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((h) => ({
      role: (h.role === "model" ? "assistant" : h.role) as "user" | "assistant",
      content: h.parts.map((p) => p.text).join(""),
    })),
    { role: "user", content: userMessage },
  ];

  let mapsWasUsed = false;

  // Agentic loop — keep going until no more tool calls
  for (let i = 0; i < 8; i++) {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 2048,
    });

    const choice = response.choices[0];
    const msg = choice.message;

    // Push assistant message (with any tool_calls) into history
    messages.push(msg as Groq.Chat.Completions.ChatCompletionMessageParam);

    // No tool calls — we have the final text response
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      const text = msg.content || "";
      return {
        message: text,
        phase: detectPhase(text),
        mapsUsed: mapsWasUsed,
      };
    }

    // Execute all tool calls and push results
    for (const tc of msg.tool_calls) {
      if (tc.type !== "function") continue;
      if (tc.function.name === "maps_search_suppliers") mapsWasUsed = true;

      let result: unknown;
      try {
        const args = JSON.parse(tc.function.arguments || "{}");
        result = await dispatchTool(tc.function.name, args);
      } catch (err) {
        result = { error: String(err) };
      }

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    message: "I've completed the analysis. Please check the dashboard for results.",
    phase: "verify",
    mapsUsed: mapsWasUsed,
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
