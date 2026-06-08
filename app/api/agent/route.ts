import { NextRequest, NextResponse } from "next/server";
import { runAgentTurn } from "@/lib/agent";

// ─── Demo fallback when API keys aren't configured ────────────────────────────
// Walks through the full 7-step loop so judges can see the flow without setup

const DEMO_RESPONSES: Array<{ match: RegExp; phase: string; message: string; mapsUsed?: boolean }> = [
  {
    match: /silent|unavailable|ghost|gone|missing|supplier|chukwuemeka/i,
    phase: "diagnose",
    message:
      "**[DEMO MODE — Add GOOGLE_API_KEY to go live]**\n\n**[SENSE]** Classified: `supplier_unavailability`\n\n**[DIAGNOSE]** I found **3 affected orders** linked to Chukwuemeka Electronics:\n\n• `SKU-REM-800` — 300 TV Remote Controls — ₦750,000\n• `SKU-REM-801` — 250 Set-Top Box Remotes — ₦800,000\n• `SKU-REM-802` — 250 Smart TV Remotes — ₦1,125,000\n\n**⚠️ Total at risk: ₦2,675,000 · Urgency: CRITICAL — deadline in 2 days**\n\nRunning MongoDB `$vectorSearch` on supplier embeddings...",
  },
  {
    match: /at.?risk|orders|diagnose/i,
    phase: "match",
    mapsUsed: true,
    message:
      "**[DEMO MODE]**\n\n**[MATCH — DB]** MongoDB Atlas `$vectorSearch` (768-dim, cosine similarity):\n• **Techmart Supplies** `[YOUR DB]` — 94% match — Reliability: 94/100\n\nOnly 1 DB result — calling Google Maps for more options...\n\n**[MATCH — MAPS]** Google Maps Places API → `\"electronics wholesaler Lagos Island\"`:\n• **Lagos Electronics Hub** `[MAPS LIVE — Open Now]` — ★ 4.3/5 · 287 reviews — Ikeja, 3.2km\n• **Alaba Int'l Market** `[MAPS LIVE — Open Now]` — ★ 4.1/5 · 512 reviews — Ojo, 7.1km\n\n_Merging DB + Maps into ranked plan..._",
  },
  {
    match: /alternative|supplier|find|search/i,
    phase: "plan",
    mapsUsed: true,
    message:
      "**[DEMO MODE]**\n\n**[PLAN]** Ranked recovery options for 800 TV remotes, Friday deadline:\n\n---\n**Option A | Techmart Supplies** `[YOUR DB]`\nMatch: **94%** · 2-day delivery · Mid price · Lagos Island\nReliability: 94/100 · 9 previous orders, no failures\n✅ **Recommended.** Best match. You've used them before. Friday deadline is safe.\n\n---\n**Option B | Lagos Electronics Hub** `[MAPS LIVE — Open Now ★4.3]`\nMatch: **87%** · 3-day delivery · 5% cheaper · Ikeja, 3.2km\n⚠️ _Tight on time. Friday delivery is possible but leaves no buffer._\n\n---\n**Option C | Alaba Int'l Market** `[MAPS LIVE — Open Now ★4.1]`\nMatch: **71%** · 4-day delivery · 8% cheaper · Ojo, 7.1km\n❌ _I don't recommend this. Delivery date has no margin for error._\n\n---\nShall I reroute all 3 orders to **Techmart Supplies** and send them a vendor email? Type **'Approve Option A'** to confirm.",
  },
  {
    match: /approve|execute|confirm|yes|go ahead/i,
    phase: "execute",
    mapsUsed: false,
    message:
      "**[DEMO MODE]**\n\n**[EXECUTE]** Operator approved Option A — Techmart Supplies.\n\n✅ `updateMany()` — 3 order records → status: `rerouted`, supplier: Techmart Supplies\n✅ Vendor email drafted + sent via Resend API → techmart@example.com\n✅ Decision log written to MongoDB:\n  - `chosen_source: \"user_db\"`\n  - `maps_results_used: true`\n  - `match_score: 0.94`\n  - `time_to_resolve_s: 167`\n\n_In production, all of this happens in your live MongoDB Atlas cluster._",
  },
  {
    match: /save|add.*database|add.*supplier/i,
    phase: "verify",
    message:
      "**[DEMO MODE]**\n\n✅ **Lagos Electronics Hub** saved to your supplier database!\n- Source: `maps_imported`\n- Google rating: ★4.3\n- Address stored\n- Now appears in future `$vectorSearch` results\n\nThey're now part of your supplier network.",
  },
  {
    match: /.*/,
    phase: "verify",
    message:
      "**[DEMO MODE — Add API keys to go live]**\n\n✅ **[VERIFY]** Resolution complete!\n\n| Metric | Value |\n|--------|-------|\n| ⏱ Time to resolve | 2m 47s |\n| 🏪 Supplier chosen | Techmart Supplies |\n| 📍 Source | YOUR DB |\n| 🎯 Match score | 94% |\n| 📦 Orders updated | 3 records |\n| 📧 Email sent | ✓ via Resend |\n| 💰 Cost delta | +₦54,000 |\n| 🗂️ Audit log | Stored ✓ |\n| 🗺️ Maps used | Yes (2 results) |\n\n**To go live:** Add `MONGODB_URI`, `GOOGLE_API_KEY`, `GOOGLE_MAPS_API_KEY`, and `RESEND_API_KEY` to your `.env.local` file, then seed from the Setup Guide.",
  },
];

function getDemoResponse(message: string) {
  return (
    DEMO_RESPONSES.find((d) => d.match.test(message)) ||
    DEMO_RESPONSES[DEMO_RESPONSES.length - 1]
  );
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Demo mode when Gemini key isn't configured
    if (
      !process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_API_KEY === "your_google_api_key_here"
    ) {
      const demo = getDemoResponse(message);
      await new Promise((r) => setTimeout(r, 1200)); // simulate thinking
      return NextResponse.json({
        message: demo.message,
        phase: demo.phase,
        mapsUsed: demo.mapsUsed ?? false,
      });
    }

    const response = await runAgentTurn(message, history);
    return NextResponse.json(response);
  } catch (err) {
    console.error("Agent error:", err);
    const errStr = String(err);

    let userMessage = "Agent failed. Check your API keys in .env.local.";
    if (errStr.includes("GOOGLE_API_KEY") || errStr.includes("API_KEY_INVALID")) {
      userMessage =
        "Invalid Google API key. Get one at aistudio.google.com and update GOOGLE_API_KEY in .env.local";
    } else if (
      errStr.includes("MONGODB") ||
      errStr.includes("MongoServerError") ||
      errStr.includes("topology")
    ) {
      userMessage =
        "Cannot connect to MongoDB. Check MONGODB_URI in .env.local and allowlist your IP in Atlas Network Access.";
    } else if (errStr.includes("RESEND")) {
      userMessage = "Resend API error. Check RESEND_API_KEY in .env.local.";
    } else if (errStr.includes("maps") || errStr.includes("GOOGLE_MAPS")) {
      userMessage =
        "Google Maps API error. Check GOOGLE_MAPS_API_KEY in .env.local. Agent will continue without Maps results.";
    }

    return NextResponse.json(
      { error: userMessage, details: errStr },
      { status: 500 }
    );
  }
}
