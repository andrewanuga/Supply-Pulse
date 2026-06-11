/**
 * generate-embeddings.js
 *
 * Replaces every supplier's fake random profile_embedding with a real
 * 768-dimensional vector from Gemini text-embedding-004.
 *
 * Run ONCE after seeding, and again whenever you add new suppliers.
 *
 * Usage:
 *   node scripts/generate-embeddings.js
 *
 * Requires .env.local to contain MONGODB_URI, MONGODB_DB_NAME, GOOGLE_API_KEY.
 */

const { MongoClient } = require("mongodb");
const https = require("https");

// ── Load .env.local ──────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
    });
}

const MONGODB_URI    = process.env.MONGODB_URI;
const MONGODB_DB     = process.env.MONGODB_DB_NAME || "supplypulse";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!MONGODB_URI || !GOOGLE_API_KEY) {
  console.error("❌  Missing MONGODB_URI or GOOGLE_API_KEY in .env.local");
  process.exit(1);
}

// ── Gemini embedding call ────────────────────────────────────────────────────
async function getEmbedding(text) {
  const body = JSON.stringify({
    model: "models/text-embedding-004",
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_DOCUMENT",
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "generativelanguage.googleapis.com",
        path: `/v1beta/models/text-embedding-004:embedContent?key=${GOOGLE_API_KEY}`,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.embedding?.values) {
              resolve(json.embedding.values);
            } else {
              reject(new Error(`Unexpected response: ${data.slice(0, 200)}`));
            }
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Build text to embed for a supplier ───────────────────────────────────────
function supplierToText(s) {
  const parts = [
    s.name,
    s.category?.join(", "),
    s.products?.join(", "),
    s.location,
    s.price_tier ? `price: ${s.price_tier}` : null,
    s.reliability_score != null ? `reliability: ${s.reliability_score}/100` : null,
  ].filter(Boolean);
  return parts.join(". ");
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✓ Connected to MongoDB");

    const db = client.db(MONGODB_DB);
    const col = db.collection("suppliers");

    const suppliers = await col.find({}).toArray();
    console.log(`Found ${suppliers.length} suppliers to embed\n`);

    let ok = 0;
    let fail = 0;

    for (const s of suppliers) {
      const text = supplierToText(s);
      try {
        const embedding = await getEmbedding(text);
        await col.updateOne(
          { _id: s._id },
          { $set: { profile_embedding: embedding } }
        );
        console.log(`  ✓  ${s.name} (${embedding.length} dims)`);
        ok++;
        // Brief pause to stay within Gemini free-tier rate limits
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        console.error(`  ✗  ${s.name}: ${err.message}`);
        fail++;
      }
    }

    console.log(`\nDone — ${ok} updated, ${fail} failed`);
    if (ok > 0) {
      console.log("\nNext step:");
      console.log("  Create the Atlas vector index (if not done yet):");
      console.log('  Atlas UI → your cluster → Search → Create Index');
      console.log('  Collection: suppliers, field: profile_embedding, 768 dims, cosine');
      console.log('  Index name: supplier_vector_index');
    }
  } finally {
    await client.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
