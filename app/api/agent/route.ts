import { NextRequest, NextResponse } from "next/server";
import { runAgentTurn } from "@/lib/agent";

// ─── Preview mode when API keys aren't configured ─────────────────────────────
// Shows the full 7-step agent flow with sample data so you can explore the UI

const DEMO_RESPONSES: Array<{ match: RegExp; phase: string; message: string; mapsUsed?: boolean }> = [
  {
    match: /silent|unavailable|ghost|gone|missing|supplier|chukwuemeka/i,
    phase: "diagnose",
    message:
      "**[SENSE]** Classified: `supplier_unavailability`\n\n**[DIAGNOSE]** I found **3 affected orders** linked to Chukwuemeka Electronics:\n\n• `SKU-REM-800` — 300 TV Remote Controls — ₦750,000\n• `SKU-REM-801` — 250 Set-Top Box Remotes — ₦800,000\n• `SKU-REM-802` — 250 Smart TV Remotes — ₦1,125,000\n\n**⚠️ Total at risk: ₦2,675,000 · Urgency: CRITICAL — deadline in 2 days**\n\nRunning MongoDB `$vectorSearch` on supplier embeddings...",
  },
  {
    match: /at.?risk|orders|diagnose/i,
    phase: "match",
    mapsUsed: true,
    message:
      "**[MATCH — DB]** MongoDB Atlas `$vectorSearch` (768-dim, cosine similarity):\n• **Techmart Supplies** `[YOUR DB]` — 94% match — Reliability: 94/100\n\nOnly 1 result from your database — expanding search with Google Maps...\n\n**[MATCH — MAPS]** Google Maps Places API → `\"electronics wholesaler Lagos Island\"`:\n• **Lagos Electronics Hub** `[MAPS LIVE — Open Now]` — ★ 4.3/5 · 287 reviews — Ikeja, 3.2km\n• **Alaba Int'l Market** `[MAPS LIVE — Open Now]` — ★ 4.1/5 · 512 reviews — Ojo, 7.1km\n\n_Merging results into ranked recovery plan..._",
  },
  {
    match: /alternative|supplier|find|search/i,
    phase: "plan",
    mapsUsed: true,
    message:
      "**[PLAN]** Ranked recovery options for 800 TV remotes, Friday deadline:\n\n---\n**Option A | Techmart Supplies** `[YOUR DB]`\nMatch: **94%** · 2-day delivery · Mid price · Lagos Island\nReliability: 94/100 · 9 previous orders, no failures\n✅ **Recommended.** Strongest match. Previous relationship. Friday deadline is safe.\n\n---\n**Option B | Lagos Electronics Hub** `[MAPS LIVE — Open Now ★4.3]`\nMatch: **87%** · 3-day delivery · 5% cheaper · Ikeja, 3.2km\n⚠️ _Tight on time. Friday delivery is possible but leaves no buffer._\n\n---\n**Option C | Alaba Int'l Market** `[MAPS LIVE — Open Now ★4.1]`\nMatch: **71%** · 4-day delivery · 8% cheaper · Ojo, 7.1km\n❌ _Not recommended. Delivery timeline has no margin for error._\n\n---\nShall I reroute all 3 orders to **Techmart Supplies** and send them a vendor email? Type **'Approve Option A'** to confirm.",
  },
  {
    match: /approve|execute|confirm|yes|go ahead/i,
    phase: "execute",
    mapsUsed: false,
    message:
      "**[EXECUTE]** Approved — rerouting to Techmart Supplies.\n\n✅ `updateMany()` — 3 order records updated → status: `rerouted`, supplier: Techmart Supplies\n✅ Vendor email sent via Resend API → techmart@example.com\n✅ Decision recorded in audit log:\n  - Chosen source: your supplier database\n  - Match score: 94%\n  - Time to resolve: 2m 47s",
  },
  {
    match: /save|add.*database|add.*supplier/i,
    phase: "verify",
    message:
      "✅ **Lagos Electronics Hub** has been saved to your supplier database.\n\n- Source: Google Maps (imported)\n- Rating: ★4.3\n- Address stored\n- Available for future supplier matching\n\nThey will now appear in `$vectorSearch` results for relevant disruptions.",
  },
  {
    match: /.*/,
    phase: "verify",
    message:
      "✅ **[VERIFY]** Resolution complete.\n\n| Metric | Value |\n|--------|-------|\n| ⏱ Time to resolve | 2m 47s |\n| 🏪 Supplier chosen | Techmart Supplies |\n| 📍 Source | Your database |\n| 🎯 Match score | 94% |\n| 📦 Orders updated | 3 records |\n| 📧 Email sent | ✓ via Resend |\n| 💰 Cost delta | +₦54,000 |\n| 🗂️ Audit log | Stored ✓ |\n| 🗺️ Maps used | Yes (2 results) |\n\n_This is a preview with sample data. To connect your live data, add `MONGODB_URI`, `GOOGLE_API_KEY`, `GOOGLE_MAPS_API_KEY`, and `RESEND_API_KEY` to your `.env.local` — then seed from the Setup Guide._",
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
