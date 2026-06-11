import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

function getSessionId(req: NextRequest): string {
  // Browser passes a per-tab session ID in the header.
  // Falls back to "demo-user" only when the header is absent (e.g. direct API calls).
  return req.headers.get("x-session-id") || "demo-user";
}

export async function GET(req: NextRequest) {
  try {
    const userId = getSessionId(req);
    const col = await getCollection("chat_history");
    const doc = await col.findOne({ userId });
    return NextResponse.json({ messages: doc?.messages || [] });
  } catch (err) {
    console.error("chat-history GET error:", err);
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getSessionId(req);
    const { messages } = await req.json();
    const col = await getCollection("chat_history");

    await col.updateOne(
      { userId },
      { $set: { userId, messages, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("chat-history POST error:", err);
    return NextResponse.json({ error: "Failed to save history" }, { status: 500 });
  }
}
