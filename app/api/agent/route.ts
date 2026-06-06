import { NextRequest, NextResponse } from "next/server";
import { runAgentTurn } from "@/lib/agent";

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const response = await runAgentTurn(message, history);

    return NextResponse.json(response);
  } catch (err) {
    console.error("Agent error:", err);
    return NextResponse.json(
      { error: "Agent failed", details: String(err) },
      { status: 500 }
    );
  }
}
