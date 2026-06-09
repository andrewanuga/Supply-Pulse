// Quick standalone MongoDB connectivity check.
// Run: node scripts/test-mongo.mjs
import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

// Minimal .env.local loader (no dependency on dotenv)
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const uri = env.MONGODB_URI;
const dbName = env.MONGODB_DB_NAME || "supplypulse";
if (!uri) {
  console.error("✗ MONGODB_URI is missing from .env.local");
  process.exit(1);
}

console.log("→ Connecting to Atlas (5s timeout)…");
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

try {
  await client.connect();
  await client.db(dbName).command({ ping: 1 });
  const cols = await client.db(dbName).listCollections().toArray();
  console.log(`✓ Connected. DB "${dbName}" has ${cols.length} collection(s):`,
    cols.map((c) => c.name).join(", ") || "(none yet)");
} catch (err) {
  console.error("✗ Connection failed:", err.message);
  if (/IP|whitelist|not allowed|ECONNREFUSED|timed out|ETIMEDOUT/i.test(err.message)) {
    console.error("→ Looks like an IP allowlist / network issue. Add your IP in Atlas → Network Access.");
  } else if (/auth|password|credentials/i.test(err.message)) {
    console.error("→ Looks like a credentials issue. Check the user/password in MONGODB_URI.");
  }
  process.exitCode = 1;
} finally {
  await client.close();
}
