import { NextRequest, NextResponse } from "next/server";
import { runAgentTurn } from "@/lib/agent";

// ─── Preview mode when API keys aren't configured ─────────────────────────────
// Shows the full 7-step agent flow with sample data so you can explore the UI

const DEMO_RESPONSES: Array<{ match: RegExp; phase: string; message: string; mapsUsed?: boolean }> = [
  {
    match: /silent|unavailable|ghost|gone|missing|supplier|chukwuemeka/i,
    phase: "diagnose",
    message:
      "[SENSE] Classified: supplier_unavailability\n\n[DIAGNOSE] Found 3 affected orders linked to Chukwuemeka Electronics:\n\n• SKU-REM-800 — 300 TV Remote Controls — ₦750,000\n• SKU-REM-801 — 250 Set-Top Box Remotes — ₦800,000\n• SKU-REM-802 — 250 Smart TV Remotes — ₦1,125,000\n\n⚠ Total at risk: ₦2,675,000 · Urgency: CRITICAL — deadline in 2 days\n\nRunning MongoDB $vectorSearch on supplier embeddings...",
  },
  {
    match: /at.?risk|orders|diagnose/i,
    phase: "match",
    mapsUsed: true,
    message:
      "[MATCH — DB] MongoDB Atlas $vectorSearch (768-dim, cosine similarity):\n• Techmart Supplies [YOUR DB] — 94% match — Reliability: 94/100\n\nOnly 1 result in your database — expanding with Google Maps...\n\n[MATCH — MAPS] Google Maps Places API → \"electronics wholesaler Lagos Island\":\n• Lagos Electronics Hub [MAPS LIVE — Open Now] — ★ 4.3/5 · 287 reviews — Ikeja, 3.2km\n• Alaba Int'l Market [MAPS LIVE — Open Now] — ★ 4.1/5 · 512 reviews — Ojo, 7.1km\n\nMerging results into ranked recovery plan...",
  },
  {
    match: /alternative|supplier|find|search/i,
    phase: "plan",
    mapsUsed: true,
    message:
      "[PLAN] Ranked recovery options — 800 TV remotes, Friday deadline:\n\n──────────────────────────────\nOPTION A — Techmart Supplies [YOUR DB]\n  Match score   : 94%\n  Lead time     : 2 days\n  Price tier    : Mid\n  Reliability   : 94/100\n  Rationale     : Strongest match. Previous relationship. Friday deadline is safe.\n  → RECOMMENDED\n──────────────────────────────\nOPTION B — Lagos Electronics Hub [MAPS LIVE — Open Now ★4.3]\n  Match score   : 87%\n  Lead time     : 3 days\n  Price tier    : Budget (5% cheaper)\n  Rating        : ★ 4.3/5 · 287 reviews — Ikeja, 3.2km\n  Rationale     : Tight on Friday — possible but leaves no buffer.\n──────────────────────────────\nOPTION C — Alaba Int'l Market [MAPS LIVE — Open Now ★4.1]\n  Match score   : 71%\n  Lead time     : 4 days\n  Price tier    : Budget (8% cheaper)\n  Rating        : ★ 4.1/5 · 512 reviews — Ojo, 7.1km\n  Rationale     : Not recommended — no margin for error on delivery.\n──────────────────────────────\n\nShall I reroute all 3 orders to Techmart Supplies and send them a vendor email? Type 'Approve Option A' to confirm.",
  },
  {
    match: /approve|execute|confirm|yes|go ahead/i,
    phase: "execute",
    mapsUsed: false,
    message:
      "[EXECUTE] Approved — rerouting to Techmart Supplies.\n\n✓ updateMany() — 3 order records updated\n    status: rerouted · supplier: Techmart Supplies\n✓ Vendor email sent via Gmail → techmart@example.com\n✓ Decision recorded in audit log\n    Source      : YOUR DB\n    Match score : 94%\n    Resolved in : 2m 47s",
  },
  {
    match: /save|add.*database|add.*supplier/i,
    phase: "verify",
    message:
      "✓ Lagos Electronics Hub saved to your supplier database.\n\n  Source   : Google Maps (imported)\n  Rating   : ★ 4.3/5\n  Address  : Stored\n\nThey will now appear in $vectorSearch results for future disruptions.",
  },
  {
    match: /.*/,
    phase: "verify",
    message:
      "RESOLUTION COMPLETE ✓\n─────────────────────────────────\n  Time to resolve  : 2m 47s\n  Supplier chosen  : Techmart Supplies\n  Source           : YOUR DB\n  Match score      : 94%\n  Orders updated   : 3 records\n  Email sent       : ✓ via Gmail\n  Cost delta       : +₦54,000\n  Audit log        : Stored ✓\n  Maps used        : Yes (2 results)\n─────────────────────────────────\n\nThis is a preview with sample data. To go live, add MONGODB_URI, GOOGLE_API_KEY, and GMAIL_USER + GMAIL_APP_PASSWORD to your .env.local — then seed from the Setup Guide.",
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

    // Preview mode when no LLM key is configured.
    // Live mode requires at least one of: GOOGLE_API_KEY (Gemini, default) or
    // GROQ_API_KEY (Groq Llama 3.3 70B, automatic fallback).
    const hasGemini =
      process.env.GOOGLE_API_KEY &&
      process.env.GOOGLE_API_KEY !== "your_google_api_key_here";
    const hasGroq =
      process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your_groq_api_key_here";
    if (!hasGemini && !hasGroq) {
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
    if (errStr.includes("GROQ_API_KEY") || errStr.includes("groq") || errStr.includes("api.groq.com")) {
      userMessage =
        "Both Gemini and the Groq fallback failed. Check GOOGLE_API_KEY and GROQ_API_KEY in .env.local.";
    } else if (
      errStr.includes("GOOGLE_API_KEY") ||
      errStr.includes("API_KEY_INVALID") ||
      errStr.includes("401")
    ) {
      userMessage =
        "Invalid Google API key. Get a free key at aistudio.google.com and add GOOGLE_API_KEY to .env.local (powers the Gemini agent + supplier embeddings).";
    } else if (
      errStr.includes("MONGODB") ||
      errStr.includes("MongoServerError") ||
      errStr.includes("topology")
    ) {
      userMessage =
        "Cannot connect to MongoDB. Check MONGODB_URI in .env.local and allowlist your IP in Atlas Network Access.";
    } else if (errStr.includes("GMAIL") || errStr.includes("nodemailer") || errStr.includes("535") || errStr.includes("auth")) {
      userMessage = "Gmail sending failed. Check GMAIL_USER and GMAIL_APP_PASSWORD in .env.local. Make sure you used an App Password, not your real Gmail password.";
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
