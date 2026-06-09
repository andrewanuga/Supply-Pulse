import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCollection } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, company } = await req.json();

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const users = await getCollection("users");
    const existing = await users.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await users.insertOne({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      company: company?.trim() || "",
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, userId: result.insertedId.toString() }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    const msg = String(err);
    if (msg.includes("ECONNREFUSED") || msg.includes("querySrv") || msg.includes("topology") || msg.includes("connect")) {
      return NextResponse.json({ error: "Cannot connect to MongoDB. Go to cloud.mongodb.com → Security → Network Access → Add IP Address → Allow Access From Anywhere (0.0.0.0/0)." }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to create account. Try again.", detail: msg }, { status: 500 });
  }
}
