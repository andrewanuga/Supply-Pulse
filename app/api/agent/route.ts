import { NextRequest, NextResponse } from "next/server";
import { runAgentTurn } from "@/lib/agent";

// Demo fallback when API keys aren't configured
const DEMO_RESPONSES: Array<{ match: RegExp; phase: string; message: string }> = [
  {
    match: /silent|unavailable|ghost|gone|missing|supplier/i,
    phase: "diagnose",
    message:
      "**[DEMO MODE — No API keys configured yet]**\n\n🔍 **DIAGNOSE:** I found **3 affected orders** linked to Chukwuemeka Electronics:\n\n• SKU-REM-800 — 300 TV Remote Controls — ₦750,000\n• SKU-REM-801 — 250 Set-Top Box Remotes — ₦800,000\n• SKU-REM-802 — 250 Smart TV Remotes — ₦1,125,000\n\n**Total at risk: ₦2,675,000**\n\nRunning MongoDB $vectorSearch to find alternative suppliers...",
  },
  {
    match: /at.?risk|orders|diagnose/i,
    phase: "match",
    message:
      "**[DEMO MODE]**\n\n🎯 **MATCH:** MongoDB Atlas $vectorSearch returned top-3 alternatives (768-dim cosine similarity):\n\n1. **Techmart Supplies** — Score: 0.94 — Lead: 2 days — Mid price — Lagos\n2. **Lagos Electronics Hub** — Score: 0.87 — Lead: 3 days — Budget — Lagos\n3. **Gadget Wholesale Ltd** — Score: 0.71 — Lead: 4 days — Budget — Ikeja\n\nGenerating recovery plan...",
  },
  {
    match: /alternative|supplier|find|search/i,
    phase: "plan",
    message:
      "**[DEMO MODE]**\n\n📋 **PLAN:** Recommended recovery options:\n\n**Option A — Techmart Supplies (Recommended)**\n• Semantic match: 94% | Reliability: 94/100\n• Lead time: 2 days | Price: +3% delta\n• Reason: Highest match, fastest lead time, proven reliability\n\n**Option B — Lagos Electronics Hub**\n• Semantic match: 87% | Reliability: 87/100\n• Lead time: 3 days | Price: same\n\n**Option C — Gadget Wholesale Ltd**\n• Semantic match: 71% | Reliability: 71/100\n• Lead time: 4 days | Price: -5% delta\n\nTo execute: type **\"Approve Option A\"** or **\"Approve Option B\"**",
  },
  {
    match: /approve|execute|confirm/i,
    phase: "execute",
    message:
      "**[DEMO MODE]**\n\n⚡ **EXECUTE:** Approved — Techmart Supplies selected.\n\n✅ MongoDB `updateMany()` — 3 order records updated to status: `rerouted`\n✅ Vendor email sent via Resend API to techmart@example.com\n✅ Decision log written to MongoDB audit trail\n\n_In production with real API keys, these writes happen live in your MongoDB Atlas cluster._",
  },
  {
    match: /.*/,
    phase: "verify",
    message:
      "**[DEMO MODE — Add API keys to go live]**\n\n✅ **VERIFY:** Demo resolution complete!\n\n| Metric | Value |\n|--------|-------|\n| Time to resolve | 2m 47s |\n| Supplier chosen | Techmart Supplies |\n| Match score | 94% |\n| Orders updated | 3 records |\n| Email sent | ✓ via Resend |\n| Additional cost | +₦54,000 |\n\n**To go live:** Add MONGODB_URI, GOOGLE_API_KEY, and RESEND_API_KEY to your `.env.local` file, then re-seed the database from the Setup Guide.",
  },
];

function getDemoResponse(message: string) {
  const r = DEMO_RESPONSES.find((d) => d.match.test(message));
  return r || DEMO_RESPONSES[DEMO_RESPONSES.length - 1];
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Demo mode when keys aren't configured
    if (!process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY === "your_google_api_key_here") {
      const demo = getDemoResponse(message);
      // Simulate thinking delay
      await new Promise((r) => setTimeout(r, 1200));
      return NextResponse.json({ message: demo.message, phase: demo.phase });
    }

    const response = await runAgentTurn(message, history);
    return NextResponse.json(response);
  } catch (err) {
    console.error("Agent error:", err);
    const errStr = String(err);

    // Helpful error messages for common issues
    let userMessage = "Agent failed. Check your API keys in .env.local.";
    if (errStr.includes("GOOGLE_API_KEY") || errStr.includes("API_KEY_INVALID")) {
      userMessage = "Invalid Google API key. Get one at aistudio.google.com and update GOOGLE_API_KEY in .env.local";
    } else if (errStr.includes("MONGODB") || errStr.includes("MongoServerError") || errStr.includes("topology")) {
      userMessage = "Cannot connect to MongoDB. Check your MONGODB_URI in .env.local. Make sure your IP is allowlisted in Atlas.";
    } else if (errStr.includes("RESEND")) {
      userMessage = "Resend API error. Check RESEND_API_KEY in .env.local.";
    }

    return NextResponse.json(
      { error: userMessage, details: errStr },
      { status: 500 }
    );
  }
}
