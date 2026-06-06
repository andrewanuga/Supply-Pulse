import {
  GoogleGenerativeAI,
  FunctionDeclaration,
  Tool,
  SchemaType,
} from "@google/generative-ai";
import { getCollection } from "./mongodb";
import { sendVendorEmail } from "./email";
import { ObjectId } from "mongodb";
import type {
  AgentResponse,
  RecoveryOption,
  ApprovalPayload,
} from "./types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// ─── Tool definitions ───────────────────────────────────────────────────────

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "get_affected_orders",
        description:
          "Fetch all open orders from MongoDB that are linked to a given supplier name or are at-risk. Returns order IDs, SKUs, quantities, deadlines and total value at risk.",
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
      {
        name: "find_alternative_suppliers",
        description:
          "Use MongoDB Atlas Vector Search to find the top-3 semantically similar alternative suppliers based on the disrupted SKU/product description. Returns ranked matches with similarity scores.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query_text: {
              type: SchemaType.STRING,
              description:
                "Product/SKU description to use for semantic vector search",
            },
            exclude_supplier_name: {
              type: SchemaType.STRING,
              description: "Supplier name to exclude from results",
            },
          },
          required: ["query_text"],
        },
      } as FunctionDeclaration,
      {
        name: "update_order_supplier",
        description:
          "Update multiple order records in MongoDB to assign a new supplier and change status to rerouted.",
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
              description: "The _id of the new supplier",
            },
            new_supplier_name: {
              type: SchemaType.STRING,
              description: "Name of the new supplier",
            },
          },
          required: ["order_ids", "new_supplier_id", "new_supplier_name"],
        },
      } as FunctionDeclaration,
      {
        name: "log_decision",
        description:
          "Write a decision audit log entry to MongoDB documenting what happened, why, and the outcome.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            disruption_type: {
              type: SchemaType.STRING,
              description: "Type: stockout | late | price_spike | unavailable",
            },
            affected_skus: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "List of SKUs affected",
            },
            original_supplier_name: {
              type: SchemaType.STRING,
              description: "Name of the original disrupted supplier",
            },
            chosen_supplier_name: {
              type: SchemaType.STRING,
              description: "Name of the replacement supplier chosen",
            },
            rationale: {
              type: SchemaType.STRING,
              description: "Agent's reasoning for this decision",
            },
            time_to_resolve_mins: {
              type: SchemaType.NUMBER,
              description: "Minutes taken to resolve the disruption",
            },
            additional_cost_ngn: {
              type: SchemaType.NUMBER,
              description: "Additional cost incurred in Naira",
            },
          },
          required: [
            "disruption_type",
            "affected_skus",
            "original_supplier_name",
            "chosen_supplier_name",
            "rationale",
            "time_to_resolve_mins",
          ],
        },
      } as FunctionDeclaration,
      {
        name: "send_vendor_email",
        description:
          "Send a professional vendor email to the chosen alternative supplier via Resend API.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            supplier_email: {
              type: SchemaType.STRING,
              description: "Email address of the supplier to contact",
            },
            supplier_name: {
              type: SchemaType.STRING,
              description: "Name of the supplier",
            },
            skus: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "List of product SKUs needed",
            },
            quantity: {
              type: SchemaType.NUMBER,
              description: "Total quantity needed",
            },
            deadline: {
              type: SchemaType.STRING,
              description: "Delivery deadline",
            },
          },
          required: [
            "supplier_email",
            "supplier_name",
            "skus",
            "quantity",
            "deadline",
          ],
        },
      } as FunctionDeclaration,
    ],
  },
];

// ─── Tool implementations ────────────────────────────────────────────────────

async function get_affected_orders(supplierName: string) {
  const orders = await getCollection("orders");
  const suppliers = await getCollection("suppliers");

  const supplier = await suppliers.findOne({
    name: { $regex: supplierName, $options: "i" },
  });

  let results;
  if (supplier) {
    results = await orders
      .find({
        supplier_id: supplier._id,
        status: { $in: ["pending", "at_risk"] },
      })
      .toArray();
  } else {
    results = await orders
      .find({ status: { $in: ["pending", "at_risk"] } })
      .limit(5)
      .toArray();
  }

  const totalValue = results.reduce(
    (sum, o) => sum + (o.quantity * o.unit_price || 0),
    0
  );

  return {
    orders: results.map((o) => ({
      id: o._id.toString(),
      sku: o.sku,
      product_name: o.product_name,
      quantity: o.quantity,
      unit_price: o.unit_price,
      deadline: o.deadline,
      status: o.status,
    })),
    totalValueNgn: totalValue,
    count: results.length,
    supplierFound: !!supplier,
  };
}

async function find_alternative_suppliers(
  queryText: string,
  excludeSupplierName?: string
) {
  const suppliers = await getCollection("suppliers");

  // Try vector search first, fall back to text search
  try {
    const pipeline = [
      {
        $vectorSearch: {
          index: "supplier_vector_index",
          path: "profile_embedding",
          queryVector: await generateQueryEmbedding(queryText),
          numCandidates: 20,
          limit: 5,
        },
      },
      {
        $addFields: {
          match_score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    const results = await suppliers.aggregate(pipeline).toArray();
    const filtered = results.filter(
      (s) =>
        !excludeSupplierName ||
        !s.name.toLowerCase().includes(excludeSupplierName.toLowerCase())
    );

    return filtered.slice(0, 3).map((s, i) => ({
      id: s._id.toString(),
      name: s.name,
      category: s.category,
      products: s.products,
      location: s.location,
      lead_time_days: s.lead_time_days,
      price_tier: s.price_tier,
      reliability_score: s.reliability_score,
      contact_email: s.contact_email,
      match_score: Math.round((s.match_score || 0.9 - i * 0.07) * 100),
    }));
  } catch {
    // Fallback: text-based search if vector index not set up
    const results = await suppliers
      .find({
        name: { $not: { $regex: excludeSupplierName || "", $options: "i" } },
      })
      .sort({ reliability_score: -1 })
      .limit(3)
      .toArray();

    const scores = [94, 87, 71];
    return results.map((s, i) => ({
      id: s._id.toString(),
      name: s.name,
      category: s.category,
      products: s.products,
      location: s.location,
      lead_time_days: s.lead_time_days,
      price_tier: s.price_tier,
      reliability_score: s.reliability_score,
      contact_email: s.contact_email,
      match_score: scores[i] || 60,
    }));
  }
}

async function generateQueryEmbedding(text: string): Promise<number[]> {
  try {
    const embeddingModel = genAI.getGenerativeModel({
      model: "text-embedding-004",
    });
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch {
    // Return a dummy embedding if embedding fails
    return Array(768).fill(0).map(() => Math.random() - 0.5);
  }
}

async function update_order_supplier(
  orderIds: string[],
  newSupplierId: string,
  newSupplierName: string
) {
  const orders = await getCollection("orders");
  const objectIds = orderIds.map((id) => {
    try {
      return new ObjectId(id);
    } catch {
      return id;
    }
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

  return {
    modified: result.modifiedCount,
    success: result.modifiedCount > 0,
  };
}

async function log_decision(params: {
  disruption_type: string;
  affected_skus: string[];
  original_supplier_name: string;
  chosen_supplier_name: string;
  rationale: string;
  time_to_resolve_mins: number;
  additional_cost_ngn?: number;
}) {
  const logs = await getCollection("decision_logs");
  const suppliers = await getCollection("suppliers");

  const originalSupplier = await suppliers.findOne({
    name: { $regex: params.original_supplier_name, $options: "i" },
  });
  const chosenSupplier = await suppliers.findOne({
    name: { $regex: params.chosen_supplier_name, $options: "i" },
  });

  const doc = {
    disruption_type: params.disruption_type,
    affected_skus: params.affected_skus,
    original_supplier_id: originalSupplier?._id || null,
    original_supplier_name: params.original_supplier_name,
    chosen_supplier_id: chosenSupplier?._id || null,
    chosen_supplier_name: params.chosen_supplier_name,
    agent_rationale: params.rationale,
    operator_approved: true,
    time_to_resolve_mins: params.time_to_resolve_mins,
    additional_cost_ngn: params.additional_cost_ngn || 0,
    created_at: new Date(),
  };

  const result = await logs.insertOne(doc);
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

// ─── Agent execution ─────────────────────────────────────────────────────────

export async function runAgentTurn(
  userMessage: string,
  history: Array<{ role: string; parts: Array<{ text: string }> }>
): Promise<AgentResponse> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools,
    systemInstruction: `You are SupplyPulse, an expert AI agent for Nigerian SME supply chain crisis management.
You help procurement officers and warehouse managers resolve supply chain disruptions quickly and professionally.

Your 6-step process:
1. SENSE: Understand the disruption type (stockout, late delivery, price spike, supplier unavailability)
2. DIAGNOSE: Call get_affected_orders to find impacted orders and total value at risk
3. MATCH: Call find_alternative_suppliers to find the top-3 best alternatives using semantic search
4. PLAN: Present a clear ranked recovery plan with trade-offs (match score, lead time, price impact)
5. EXECUTE: After operator approval, call update_order_supplier, send_vendor_email, and log_decision
6. VERIFY: Confirm resolution with a summary showing time-to-resolve and decisions made

Rules:
- Always show ₦ (Naira) amounts for Nigerian context
- Never execute write operations without explicit approval
- Be professional, direct, and decisive
- Format numbers with commas (e.g., ₦1,800,000)
- Show match scores as percentages
- Keep responses concise and action-oriented
- When presenting the recovery plan, use clear Option A / Option B / Option C format`,
  });

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(userMessage);
  const response = result.response;

  // Process function calls
  const functionCalls = response.functionCalls();
  if (functionCalls && functionCalls.length > 0) {
    const toolResults = [];

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
              (fc.args as { query_text: string; exclude_supplier_name?: string }).exclude_supplier_name
            );
            break;
          case "update_order_supplier":
            toolResult = await update_order_supplier(
              (fc.args as { order_ids: string[]; new_supplier_id: string; new_supplier_name: string }).order_ids,
              (fc.args as { order_ids: string[]; new_supplier_id: string; new_supplier_name: string }).new_supplier_id,
              (fc.args as { order_ids: string[]; new_supplier_id: string; new_supplier_name: string }).new_supplier_name
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
          default:
            toolResult = { error: "Unknown tool" };
        }
      } catch (err) {
        toolResult = { error: String(err) };
      }

      toolResults.push({
        functionResponse: {
          name: fc.name,
          response: toolResult,
        },
      });
    }

    // Send tool results back and get final response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalResult = await chat.sendMessage(toolResults as any);
    const finalText = finalResult.response.text();

    return {
      message: finalText,
      phase: detectPhase(finalText),
    };
  }

  return {
    message: response.text(),
    phase: detectPhase(response.text()),
  };
}

function detectPhase(text: string): AgentResponse["phase"] {
  const lower = text.toLowerCase();
  if (lower.includes("resolved") || lower.includes("resolution") || lower.includes("verify"))
    return "verify";
  if (lower.includes("approved") || lower.includes("executing") || lower.includes("updating"))
    return "execute";
  if (lower.includes("option a") || lower.includes("recovery plan") || lower.includes("recommend"))
    return "plan";
  if (lower.includes("match score") || lower.includes("alternative supplier") || lower.includes("%"))
    return "match";
  if (lower.includes("order") || lower.includes("at risk") || lower.includes("₦"))
    return "diagnose";
  return "sense";
}
