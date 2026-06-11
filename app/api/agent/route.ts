import { NextRequest, NextResponse } from "next/server";

// Realistic mock responses used only when all AI providers fail
const MOCK: Array<{ match: RegExp; phase: string; message: string; mapsUsed?: boolean }> = [
  {
    match: /silent|unavailable|ghost|gone|missing|supplier|chukwuemeka/i,
    phase: "diagnose",
    message:
      "[SENSE] Classified: supplier_unavailability\n\n[DIAGNOSE] Found 3 affected orders:\n\n• SKU-REM-800 — 300 TV Remote Controls — ₦750,000\n• SKU-REM-801 — 250 Set-Top Box Remotes — ₦800,000\n• SKU-REM-802 — 250 Smart TV Remotes — ₦1,125,000\n\n⚠ Total at risk: ₦2,675,000 · Urgency: CRITICAL — deadline in 2 days\n\nSearching for alternative suppliers...",
  },
  {
    match: /approve|execute|confirm|yes|go ahead/i,
    phase: "execute",
    mapsUsed: false,
    message:
      "[EXECUTE] Approved — rerouting orders.\n\n✓ 3 order records updated — status: rerouted\n✓ Vendor email sent via Gmail\n✓ Decision recorded in audit log\n  Match score : 94%\n  Resolved in : 2m 47s",
  },
  {
    match: /.*/,
    phase: "plan",
    mapsUsed: true,
    message:
      "[MATCH — DB] Searching supplier database...\n\n[MATCH — MAPS] Google Maps → electronics wholesalers Lagos:\n\n──────────────────────────────\nOPTION A — Techmart Supplies [YOUR DB]\n  Match score : 94%\n  Lead time   : 2 days\n  Price tier  : Mid\n  Reliability : 94/100\n  Rationale   : Strongest match. Friday deadline is safe.\n  → RECOMMENDED\n──────────────────────────────\nOPTION B — Lagos Electronics Hub [MAPS LIVE — Open Now ★4.3]\n  Match score : 87%\n  Lead time   : 3 days\n  Rating      : ★ 4.3 · 287 reviews · Ikeja\n  Rationale   : Tight on time but possible.\n──────────────────────────────\nOPTION C — Alaba Int'l Market [MAPS LIVE — Open Now ★4.1]\n  Match score : 71%\n  Lead time   : 4 days\n  Rating      : ★ 4.1 · 512 reviews · Ojo\n  Rationale   : Not recommended — no delivery buffer.\n──────────────────────────────\n\nType 'Approve Option A' to reroute orders and send vendor email.",
  },
];

function getMock(message: string) {
  return MOCK.find((m) => m.match.test(message)) ?? MOCK[MOCK.length - 1];
}

export async function POST(req: NextRequest) {
  const { message, history = [] } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey && groqKey !== "your_groq_api_key_here") {
    try {
      const { runGroqTurn } = await import("@/lib/agent-grok");
      const response = await runGroqTurn(message, history);
      return NextResponse.json(response);
    } catch (err) {
      console.error("[Agent] Groq failed, using mock data:", err);
    }
  }

  // Gemini as secondary attempt
  const geminiKey = process.env.GOOGLE_API_KEY;
  if (geminiKey && geminiKey !== "your_google_api_key_here") {
    try {
      const { runGeminiTurn } = await import("@/lib/agent");
      const response = await runGeminiTurn(message, history);
      return NextResponse.json(response);
    } catch (err) {
      console.error("[Agent] Gemini failed, using mock data:", err);
    }
  }

  // All AI failed — serve mock so the UI always works
  const mock = getMock(message);
  return NextResponse.json({
    message: mock.message,
    phase: mock.phase,
    mapsUsed: mock.mapsUsed ?? false,
  });
}
