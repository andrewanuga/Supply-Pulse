import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

// Auth is temporarily disabled — chat history is stored under a single shared
// demo user. When auth is re-added, swap DEMO_USER_ID back for the session user id
// (see git history / the commented getServerSession calls below).
const DEMO_USER_ID = "demo-user";

// GET /api/chat-history — load the demo user's chat history
export async function GET() {
  try {
    const col = await getCollection("chat_history");
    const doc = await col.findOne({ userId: DEMO_USER_ID });
    return NextResponse.json({ messages: doc?.messages || [] });
  } catch (err) {
    console.error("chat-history GET error:", err);
    return NextResponse.json({ messages: [] });
  }
}

// POST /api/chat-history — save / replace the demo user's full chat history
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const col = await getCollection("chat_history");

    await col.updateOne(
      { userId: DEMO_USER_ID },
      {
        $set: {
          userId: DEMO_USER_ID,
          messages,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("chat-history POST error:", err);
    return NextResponse.json({ error: "Failed to save history" }, { status: 500 });
  }
}
