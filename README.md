# ⚡ SupplyPulse

**AI Agent for Nigerian SME Supply Chain Crisis Management**

> *"Because your suppliers' problems shouldn't become your customers' problems."*

SupplyPulse resolves supply chain disruptions in under **3 minutes** — MongoDB Atlas Vector Search + Gemini 2.0 Flash + autonomous multi-tool execution with human-in-the-loop approval.

**Hackathon:** Building Agents for Real-World Challenges · **Track:** MongoDB

---

## 🚀 Quick Start

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.local .env.local.bak   # it already exists with placeholders
# Edit .env.local with your real keys (see below)

# 3. Run
npm run dev
```

Open **http://localhost:3000** → click **Dashboard** → **Seed Data** → **Start Agent**

---

## 🔑 Environment Variables

Edit `.env.local`:

```env
# MongoDB Atlas — cloud.mongodb.com → Connect → Drivers
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=supplypulse

# Google AI Studio — aistudio.google.com → Get API Key
GOOGLE_API_KEY=AIza...

# Google Maps Places API — console.cloud.google.com → Enable "Places API"
# Used for live supplier fallback when DB has < 3 results (cold-start fix)
# Optional: demo mode returns realistic Lagos data when key is absent
GOOGLE_MAPS_API_KEY=AIza...

# Resend — resend.com → API Keys (free: 3,000 emails/month)
RESEND_API_KEY=re_...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🗄️ MongoDB Atlas Setup

### 1. Create Cluster
Free M0 tier at [cloud.mongodb.com](https://cloud.mongodb.com) — takes 2 minutes.

### 2. Allowlist Your IP
Atlas → Security → Network Access → Add IP Address → Allow from anywhere (0.0.0.0/0) for demo.

### 3. Seed Data (2 options)

**Option A — Dashboard UI (quick):**
Go to Dashboard → click **"Seed Data"** button in the topbar.
This inserts 15 suppliers with random embeddings + 7 orders.

**Option B — Python script (recommended for real vector search):**
```bash
pip install pymongo google-generativeai python-dotenv
python scripts/seed.py
```
This generates real 768-dim `text-embedding-004` embeddings — required for Atlas $vectorSearch to work properly.

### 4. Create Vector Search Index
1. Atlas UI → your cluster → **Search** tab → **Create Search Index**
2. Select **Atlas Vector Search** (not Full-Text Search)
3. Choose database: `supplypulse`, collection: `suppliers`
4. Use this JSON definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "profile_embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    }
  ]
}
```

5. Name it: `supplier_vector_index`

> **Without this index**, the agent falls back to reliability-score sorting — demo still works, just no semantic matching.

---

## 🤖 How the Agent Works

```
User: "Supplier Chukwuemeka Electronics has gone silent. 
       3 open orders, 800 TV remotes needed by Friday."

[SENSE]      → Classifies: supplier_unavailability
[DIAGNOSE]   → get_affected_orders() → 3 orders, ₦1,800,000 at risk
[MATCH-DB]   → find_alternative_suppliers() → $vectorSearch on 768-dim embeddings
               ↳ Techmart Supplies [YOUR DB] — 94% match
[MATCH-MAPS] → maps_search_suppliers() — DB < 3 results, Google Maps fallback fires
               ↳ Lagos Electronics Hub [MAPS LIVE — Open Now ★4.3]
               ↳ Alaba Int'l Market [MAPS LIVE — Open Now ★4.1]
[PLAN]       → Ranked recovery plan: Option A / B / C with source provenance
[EXECUTE]    → Operator types "Approve Option A"
               ↳ update_order_supplier() — 3 MongoDB records updated
               ↳ send_vendor_email() — email sent via Resend API
               ↳ log_decision() — decision + source written to audit trail
[VERIFY]     → Resolution: 2m 47s, +₦54,000, chosen_source: "user_db", audit stored
```

**7 real Gemini function calls. Real MongoDB reads + writes. Real email sent. Cold-start solved via Google Maps.**

---

## 📁 Project Structure

```
supply-pulse/
├── app/
│   ├── page.tsx              # Landing page (3D scroll-interactive)
│   ├── dashboard/page.tsx    # Operator dashboard
│   ├── api/
│   │   ├── agent/route.ts    # POST /api/agent — Gemini function calling
│   │   ├── disruptions/      # GET /api/disruptions — stats + logs
│   │   ├── orders/           # GET /api/orders — enriched orders
│   │   └── seed/             # POST /api/seed — seed demo data
│   ├── not-found.tsx         # 404 page
│   ├── error.tsx             # Error boundary
│   └── loading.tsx           # Loading state
├── lib/
│   ├── agent.ts              # Core Gemini agent + 7 tool implementations
│   ├── maps.ts               # Google Maps Places API fallback (cold-start fix)
│   ├── mongodb.ts            # MongoDB Atlas connection (global singleton)
│   ├── email.ts              # Resend vendor email
│   ├── types.ts              # TypeScript interfaces (v3 schema)
│   └── utils.ts              # Helpers: formatNaira, getStatusColor, etc.
├── components/
│   ├── providers.tsx         # next-themes ThemeProvider
│   └── ui/
│       ├── button.tsx        # Blue design system button
│       ├── badge.tsx         # Status badge
│       └── theme-toggle.tsx  # Dark/light mode toggle
├── scripts/
│   └── seed.py               # Python seed with real embeddings
└── vercel.json               # Vercel deployment config
```

---

## 🚢 Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Add environment variables in Vercel dashboard → Settings → Environment Variables.

Or connect your GitHub repo at [vercel.com/new](https://vercel.com/new) for automatic deploys on push.

---

## 🏆 Features Built (PRD Compliance)

| Feature | ID | Status |
|---------|-----|--------|
| Natural Language Disruption Intake | F-01 | ✅ |
| Disruption Classification | F-02 | ✅ |
| MongoDB Vector Search Matching | F-03 ★ | ✅ |
| Google Maps Places Fallback | F-04 ★ | ✅ |
| Source Labelling [YOUR DB] / [MAPS LIVE] | F-05 | ✅ |
| Ranked Recovery Plan Generation | F-06 | ✅ |
| Human-in-the-Loop Approval | F-07 | ✅ |
| MongoDB Order Updates | F-08 | ✅ |
| Automated Vendor Email (Resend) | F-09 | ✅ |
| Full Decision Audit Trail (v3 schema) | F-10 | ✅ |
| Resolution Summary Card | F-11 | ✅ |
| Operator Dashboard with KPIs | F-12 | ✅ |
| Maps vs DB Source Breakdown (F-12) | F-12 | ✅ |
| Save Maps Supplier to MongoDB | F-13 | ✅ |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| AI Agent | Gemini 2.0 Flash (function calling via `@google/generative-ai`) |
| Database | MongoDB Atlas (documents + `$vectorSearch`) |
| Embeddings | Google `text-embedding-004` (768 dimensions) |
| Supplier Discovery | Google Maps Places API (Text Search, cold-start fallback) |
| Email | Resend API |
| Theme | `next-themes` (dark `#121212` + blue / light `#fff` + blue) |
| Deployment | Vercel |

**Not used (removed from original PRD):** Google Cloud Agent Builder, Clerk/Supabase Auth

---

## 🎯 3-Minute Demo Script

| Time | Step | What to say/do |
|------|------|---------------|
| 0:00 | Hook | "A supplier just ghosted a ₦2.4M order. Watch SupplyPulse resolve it in under 3 minutes." |
| 0:20 | Intake | Type: "Supplier Chukwuemeka Electronics has gone silent. 3 open orders, 800 TV remotes needed by Friday." |
| 0:50 | Diagnose + Match | Show: 3 orders, ₦1.8M at risk. Vector search returns Techmart (94%), Lagos Hub (87%), Gadget (71%). |
| 1:20 | Plan | Option A: Techmart — 94%, 2-day, +3% price. Full rationale shown. |
| 1:50 | Execute | Click Approve. MongoDB records update live. Email sent. Decision log written. |
| 2:20 | Verify | Resolution: 2m 47s, ₦54k cost delta, audit trail stored. |
| 2:40 | Close | "Because your suppliers' problems shouldn't become your customers' problems." |

---

*Built for the MongoDB Hackathon · June 2026 · SupplyPulse Team*
