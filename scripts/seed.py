"""
SupplyPulse — MongoDB Seed Script with Real Embeddings
Run: python scripts/seed.py
Requires: pip install pymongo google-generativeai python-dotenv

Dataset size is configurable via environment variables (defaults make a LARGE set):
    SEED_SUPPLIERS   total suppliers   (default 300; the 15 curated ones are always kept)
    SEED_ORDERS      total orders      (default 1000)
    SEED_LOGS        decision logs      (default 200)
e.g.  SEED_SUPPLIERS=800 SEED_ORDERS=4000 python scripts/seed.py
"""
import os
import time
from datetime import datetime, timedelta
import random

try:
    from dotenv import load_dotenv
    from pymongo import MongoClient
    import google.generativeai as genai
except ImportError:
    print("Install dependencies: pip install pymongo google-generativeai python-dotenv")
    exit(1)

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME", "supplypulse")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# ─── Dataset sizing (env-overridable) ─────────────────────────────────────────
NUM_SUPPLIERS = int(os.getenv("SEED_SUPPLIERS", "300"))
NUM_ORDERS = int(os.getenv("SEED_ORDERS", "1000"))
NUM_DECISION_LOGS = int(os.getenv("SEED_LOGS", "200"))
EMBED_BATCH_SIZE = int(os.getenv("SEED_EMBED_BATCH", "100"))

# Reproducible generation across runs
random.seed(42)

if not MONGO_URI:
    print("ERROR: MONGODB_URI not set in .env")
    exit(1)

genai.configure(api_key=GOOGLE_API_KEY)

# ─── Curated suppliers (always seeded first — demo + agent narrative depend on
#     index 0 = Chukwuemeka Electronics, index 1 = Techmart Supplies) ───────────
CURATED_SUPPLIERS = [
    {"name": "Chukwuemeka Electronics", "category": ["electronics", "consumer_goods"], "products": ["TV remotes", "set-top boxes", "power banks", "charging cables"], "location": {"city": "Lagos", "state": "Lagos"}, "lead_time_days": 2, "price_tier": "mid", "reliability_score": 72, "contact_email": "chukwuemeka@example.com"},
    {"name": "Techmart Supplies", "category": ["electronics", "gadgets"], "products": ["remote controls", "consumer electronics", "TV accessories", "gadgets"], "location": {"city": "Lagos", "state": "Lagos"}, "lead_time_days": 2, "price_tier": "mid", "reliability_score": 94, "contact_email": "techmart@example.com"},
    {"name": "Lagos Electronics Hub", "category": ["electronics", "FMCG"], "products": ["electronics accessories", "TV remotes", "cables", "adapters"], "location": {"city": "Lagos", "state": "Lagos"}, "lead_time_days": 3, "price_tier": "budget", "reliability_score": 87, "contact_email": "lagoselec@example.com"},
    {"name": "Gadget Wholesale Ltd", "category": ["electronics", "wholesale"], "products": ["remote controls", "gadgets", "consumer electronics", "batteries"], "location": {"city": "Ikeja", "state": "Lagos"}, "lead_time_days": 4, "price_tier": "budget", "reliability_score": 71, "contact_email": "gadgetwholesale@example.com"},
    {"name": "Abuja Tech Traders", "category": ["electronics", "tech"], "products": ["electronics", "computers", "phones", "accessories"], "location": {"city": "Abuja", "state": "FCT"}, "lead_time_days": 3, "price_tier": "premium", "reliability_score": 89, "contact_email": "abujatech@example.com"},
    {"name": "Port Harcourt Distributors", "category": ["FMCG", "wholesale"], "products": ["consumer goods", "household items", "food products", "beverages"], "location": {"city": "Port Harcourt", "state": "Rivers"}, "lead_time_days": 5, "price_tier": "budget", "reliability_score": 78, "contact_email": "phdist@example.com"},
    {"name": "Kano Central Supplies", "category": ["FMCG", "textiles"], "products": ["fabrics", "clothing", "household goods", "provisions"], "location": {"city": "Kano", "state": "Kano"}, "lead_time_days": 4, "price_tier": "budget", "reliability_score": 82, "contact_email": "kanosupplies@example.com"},
    {"name": "Surulere Electronics", "category": ["electronics", "appliances"], "products": ["home appliances", "electronics", "TVs", "refrigerators"], "location": {"city": "Lagos", "state": "Lagos"}, "lead_time_days": 3, "price_tier": "mid", "reliability_score": 85, "contact_email": "surulere@example.com"},
    {"name": "Alaba Int'l Market Hub", "category": ["electronics", "wholesale", "gadgets"], "products": ["all electronics", "phones", "laptops", "accessories", "remote controls"], "location": {"city": "Lagos", "state": "Lagos"}, "lead_time_days": 1, "price_tier": "budget", "reliability_score": 76, "contact_email": "alaba@example.com"},
    {"name": "Premium Tech Vendors", "category": ["electronics", "premium"], "products": ["high-end electronics", "smart devices", "premium accessories"], "location": {"city": "Victoria Island", "state": "Lagos"}, "lead_time_days": 2, "price_tier": "premium", "reliability_score": 96, "contact_email": "premiumtech@example.com"},
    {"name": "Enugu Wholesale Center", "category": ["FMCG", "wholesale"], "products": ["provisions", "food items", "beverages", "household goods"], "location": {"city": "Enugu", "state": "Enugu"}, "lead_time_days": 6, "price_tier": "budget", "reliability_score": 80, "contact_email": "enuguwholesale@example.com"},
    {"name": "Onitsha Bridge Market", "category": ["textiles", "FMCG", "wholesale"], "products": ["fabrics", "clothing", "food", "general merchandise"], "location": {"city": "Onitsha", "state": "Anambra"}, "lead_time_days": 5, "price_tier": "budget", "reliability_score": 74, "contact_email": "onitshabridge@example.com"},
    {"name": "Kaduna Industrial Supply", "category": ["industrial", "manufacturing"], "products": ["industrial parts", "machinery components", "raw materials"], "location": {"city": "Kaduna", "state": "Kaduna"}, "lead_time_days": 7, "price_tier": "mid", "reliability_score": 88, "contact_email": "kadunaind@example.com"},
    {"name": "Ibadan Mega Stores", "category": ["FMCG", "retail", "wholesale"], "products": ["consumer goods", "food", "beverages", "household items"], "location": {"city": "Ibadan", "state": "Oyo"}, "lead_time_days": 3, "price_tier": "mid", "reliability_score": 83, "contact_email": "ibadanmega@example.com"},
    {"name": "Delta Tech Solutions", "category": ["electronics", "industrial"], "products": ["electronic components", "industrial electronics", "control systems"], "location": {"city": "Warri", "state": "Delta"}, "lead_time_days": 5, "price_tier": "premium", "reliability_score": 91, "contact_email": "deltatech@example.com"},
]

# ─── Generation pools ─────────────────────────────────────────────────────────
OWNER_NAMES = [
    "Chukwuemeka", "Adebayo", "Ngozi", "Emeka", "Oluwaseun", "Ibrahim", "Aisha",
    "Chinedu", "Folake", "Musa", "Tunde", "Yakubu", "Ifeoma", "Babatunde", "Halima",
    "Obinna", "Funmilayo", "Suleiman", "Chiamaka", "Olumide", "Nneka", "Abdullahi",
    "Kelechi", "Bola", "Uche", "Sani", "Damilola", "Ekene", "Hauwa", "Segun",
    "Adaeze", "Yusuf", "Bisi", "Okonkwo", "Zainab", "Chidi", "Temitope", "Garba",
]
BUSINESS_SUFFIXES = [
    "Electronics", "Supplies", "Trading Co", "Ventures", "Enterprises",
    "Global Resources", "Nigeria Ltd", "& Sons", "Distributors", "Wholesale",
    "Stores", "Mega Mart", "Imports", "Hub", "Depot", "Industries", "Logistics",
    "Holdings", "Merchants", "Solutions", "Investments", "Commercial",
]

# city -> state
LOCATIONS = [
    ("Lagos", "Lagos"), ("Ikeja", "Lagos"), ("Victoria Island", "Lagos"),
    ("Surulere", "Lagos"), ("Lekki", "Lagos"), ("Abuja", "FCT"),
    ("Port Harcourt", "Rivers"), ("Kano", "Kano"), ("Ibadan", "Oyo"),
    ("Enugu", "Enugu"), ("Onitsha", "Anambra"), ("Kaduna", "Kaduna"),
    ("Warri", "Delta"), ("Benin City", "Edo"), ("Aba", "Abia"),
    ("Jos", "Plateau"), ("Uyo", "Akwa Ibom"), ("Maiduguri", "Borno"),
    ("Owerri", "Imo"), ("Abeokuta", "Ogun"), ("Ilorin", "Kwara"),
    ("Calabar", "Cross River"), ("Sokoto", "Sokoto"), ("Akure", "Ondo"),
    ("Asaba", "Delta"), ("Zaria", "Kaduna"), ("Makurdi", "Benue"),
]

# category -> (sku_code, product catalog)
CATEGORY_CATALOG = {
    "electronics": ("ELC", ["TV remotes", "set-top boxes", "power banks", "charging cables", "HDMI cables", "USB-C adapters", "Bluetooth speakers", "earphones", "phone accessories", "smart watches", "LED bulbs", "extension boxes", "inverters", "rechargeable batteries"]),
    "FMCG": ("FMC", ["bagged rice", "soft drinks", "cooking oil", "detergents", "toiletries", "canned food", "snacks", "bottled water", "milk powder", "sugar", "instant noodles", "tea bags"]),
    "textiles": ("TXT", ["ankara fabrics", "lace materials", "school uniforms", "bedsheets", "towels", "curtains", "ready-made clothing", "head wraps"]),
    "industrial": ("IND", ["machinery parts", "bearings", "hydraulic components", "welding rods", "steel rods", "PVC pipes", "industrial valves", "conveyor belts"]),
    "appliances": ("APP", ["refrigerators", "air conditioners", "washing machines", "microwaves", "standing fans", "blenders", "water dispensers", "electric kettles"]),
    "automotive": ("AUT", ["car batteries", "tyres", "brake pads", "engine oil", "spare parts", "oil filters", "windscreens", "shock absorbers"]),
    "agriculture": ("AGR", ["fertilizers", "improved seeds", "pesticides", "farm tools", "poultry feed", "irrigation equipment", "knapsack sprayers"]),
    "pharmaceuticals": ("PHA", ["OTC medicines", "medical consumables", "first aid supplies", "vitamin supplements", "hand sanitizers", "surgical gloves"]),
    "building": ("BLD", ["floor tiles", "emulsion paint", "roofing sheets", "plumbing fixtures", "electrical fittings", "cement", "wooden doors"]),
    "food_packaging": ("PKG", ["plastic containers", "paper bags", "cling film", "disposable cups", "food trays", "nylon rolls", "takeaway packs"]),
}
CATEGORIES = list(CATEGORY_CATALOG.keys())
PRICE_TIERS = ["budget", "mid", "premium"]

DISRUPTION_TYPES = ["stockout", "late", "price_spike", "unavailable"]


def generate_suppliers(n: int, existing_names: set) -> list[dict]:
    """Generate n unique, realistic Nigerian B2B suppliers."""
    suppliers = []
    attempts = 0
    while len(suppliers) < n and attempts < n * 20:
        attempts += 1
        owner = random.choice(OWNER_NAMES)
        suffix = random.choice(BUSINESS_SUFFIXES)
        name = f"{owner} {suffix}"
        if name in existing_names:
            # disambiguate with a city to keep it realistic
            city0 = random.choice(LOCATIONS)[0]
            name = f"{owner} {suffix} ({city0})"
            if name in existing_names:
                continue
        existing_names.add(name)

        primary = random.choice(CATEGORIES)
        extra_cats = random.sample(
            [c for c in CATEGORIES if c != primary],
            k=random.randint(0, 2),
        )
        categories = [primary] + extra_cats

        # Build a product list drawn from the chosen categories
        products = []
        for cat in categories:
            catalog = CATEGORY_CATALOG[cat][1]
            products += random.sample(catalog, k=random.randint(2, 4))
        # de-dupe while preserving order
        products = list(dict.fromkeys(products))

        city, state = random.choice(LOCATIONS)
        slug = "".join(ch for ch in name.lower() if ch.isalnum())[:24]

        suppliers.append({
            "name": name,
            "category": categories,
            "products": products,
            "location": {"city": city, "state": state},
            "lead_time_days": random.randint(1, 10),
            "price_tier": random.choices(PRICE_TIERS, weights=[4, 4, 2])[0],
            "reliability_score": random.randint(60, 98),
            "contact_email": f"{slug}@example.com",
        })
    return suppliers


def get_embedding(text: str) -> list[float]:
    """Generate a single embedding using Google's text-embedding-004."""
    try:
        result = genai.embed_content(model="models/text-embedding-004", content=text)
        return result["embedding"]
    except Exception as e:
        print(f"  Embedding error: {e}, using random fallback")
        return [random.gauss(0, 0.1) for _ in range(768)]


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed a list of texts, chunked to stay within request limits.

    Falls back to a random vector for any chunk that errors so a single bad
    batch never aborts a large seed run.
    """
    out: list[list[float]] = []
    total = len(texts)
    for start in range(0, total, EMBED_BATCH_SIZE):
        chunk = texts[start:start + EMBED_BATCH_SIZE]
        try:
            result = genai.embed_content(model="models/text-embedding-004", content=chunk)
            emb = result["embedding"]
            # API returns a list-of-lists for batch input, a single list for one item
            if chunk and isinstance(emb[0], (int, float)):
                emb = [emb]
            out.extend(emb)
        except Exception as e:
            print(f"  Batch embed error ({start}-{start + len(chunk)}): {e}, random fallback")
            out.extend([[random.gauss(0, 0.1) for _ in range(768)] for _ in chunk])
        done = min(start + EMBED_BATCH_SIZE, total)
        print(f"    embedded {done}/{total}")
        time.sleep(0.2)  # gentle rate limit between batches
    return out


def build_profile_text(supplier: dict) -> str:
    """Build a rich text description for embedding."""
    return (
        f"Supplier: {supplier['name']}. "
        f"Categories: {', '.join(supplier['category'])}. "
        f"Products: {', '.join(supplier['products'])}. "
        f"Location: {supplier['location']['city']}, {supplier['location']['state']}, Nigeria. "
        f"Lead time: {supplier['lead_time_days']} days. "
        f"Price tier: {supplier['price_tier']}. "
        f"Reliability: {supplier['reliability_score']}/100."
    )


# ─── Curated demo orders (Chukwuemeka scenario — keep verbatim) ───────────────
CURATED_ORDERS = [
    {"sku": "SKU-REM-800", "product_name": "TV Remote Controls (Universal)", "quantity": 300, "unit_price": 2500, "deadline": "2026-06-13", "status": "pending"},
    {"sku": "SKU-REM-801", "product_name": "Set-Top Box Remote Controls", "quantity": 250, "unit_price": 3200, "deadline": "2026-06-13", "status": "pending"},
    {"sku": "SKU-REM-802", "product_name": "Smart TV Remote Controls", "quantity": 250, "unit_price": 4500, "deadline": "2026-06-14", "status": "pending"},
    {"sku": "SKU-CBL-101", "product_name": "HDMI Cables 2m", "quantity": 500, "unit_price": 1800, "deadline": "2026-06-15", "status": "pending"},
    {"sku": "SKU-PWR-201", "product_name": "Power Banks 10000mAh", "quantity": 150, "unit_price": 8500, "deadline": "2026-06-20", "status": "pending"},
    {"sku": "SKU-ADP-301", "product_name": "USB-C Adapters", "quantity": 400, "unit_price": 2200, "deadline": "2026-06-18", "status": "fulfilled"},
    {"sku": "SKU-SPK-401", "product_name": "Bluetooth Speakers Mini", "quantity": 100, "unit_price": 12000, "deadline": "2026-06-25", "status": "fulfilled"},
]

STATUS_WEIGHTS = {"pending": 40, "at_risk": 18, "rerouted": 10, "fulfilled": 32}
TIER_PRICE_RANGE = {"budget": (600, 6000), "mid": (3000, 18000), "premium": (12000, 60000)}


def generate_orders(suppliers: list[dict], supplier_ids: list, n: int) -> list[dict]:
    """Generate n orders distributed across all suppliers, with realistic
    SKUs, statuses, prices, and deadlines."""
    statuses = list(STATUS_WEIGHTS.keys())
    weights = list(STATUS_WEIGHTS.values())
    now = datetime.now()
    docs = []
    for i in range(n):
        idx = random.randrange(len(suppliers))
        supplier = suppliers[idx]
        cat = supplier["category"][0]
        sku_code = CATEGORY_CATALOG.get(cat, ("GEN", []))[0]
        product = random.choice(supplier["products"])
        status = random.choices(statuses, weights=weights)[0]
        low, high = TIER_PRICE_RANGE[supplier["price_tier"]]

        if status in ("pending", "at_risk"):
            deadline = now + timedelta(days=random.randint(1, 45))
        elif status == "rerouted":
            deadline = now + timedelta(days=random.randint(1, 20))
        else:  # fulfilled
            deadline = now - timedelta(days=random.randint(1, 60))

        docs.append({
            "sku": f"SKU-{sku_code}-{1000 + i}",
            "product_name": product.title(),
            "quantity": random.choice([50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000]),
            "unit_price": random.randint(low, high),
            "deadline": deadline.strftime("%Y-%m-%d"),
            "status": status,
            "supplier_id": supplier_ids[idx],
            "supplier_name": supplier["name"],
            "created_at": now - timedelta(days=random.randint(1, 90)),
            "updated_at": now,
        })
    return docs


def generate_decision_logs(suppliers: list[dict], supplier_ids: list, n: int) -> list[dict]:
    """Generate n historical decision logs spread over the last ~90 days."""
    now = datetime.now()
    docs = []
    for _ in range(n):
        oi = random.randrange(len(suppliers))
        ci = random.randrange(len(suppliers))
        while ci == oi:
            ci = random.randrange(len(suppliers))
        original = suppliers[oi]
        chosen = suppliers[ci]
        source = random.choices(["user_db", "google_maps"], weights=[7, 3])[0]
        match = round(random.uniform(0.68, 0.98), 2)
        ttr = random.randint(45, 280)
        cost_delta = random.choice([-1, 1]) * random.randint(0, 90) * 1000

        docs.append({
            "disruption_type": random.choice(DISRUPTION_TYPES),
            "affected_skus": [f"SKU-{random.choice(list(CATEGORY_CATALOG.values()))[0]}-{random.randint(1000, 1999)}"
                              for _ in range(random.randint(1, 3))],
            "original_supplier_id": supplier_ids[oi],
            "original_supplier_name": original["name"],
            "chosen_supplier_id": supplier_ids[ci],
            "chosen_supplier_name": chosen["name"],
            "chosen_source": source,
            "maps_results_used": source == "google_maps",
            "agent_rationale": (
                f"{chosen['name']} selected — {int(match * 100)}% vector match, "
                f"{chosen['lead_time_days']}-day lead time, reliability {chosen['reliability_score']}/100."
            ),
            "match_score": match,
            "operator_approved": True,
            "time_to_resolve_s": ttr,
            "time_to_resolve_mins": round(ttr / 60),
            "cost_delta_ngn": cost_delta,
            "additional_cost_ngn": cost_delta,
            "created_at": now - timedelta(days=random.randint(0, 90), hours=random.randint(0, 23)),
        })
    return docs


def main():
    print("🔌 Connecting to MongoDB...")
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    print("🗑️  Clearing existing collections...")
    db.suppliers.delete_many({})
    db.orders.delete_many({})
    db.decision_logs.delete_many({})

    # ── Build supplier list: curated first, then generated ────────────────────
    names = {s["name"] for s in CURATED_SUPPLIERS}
    extra = max(0, NUM_SUPPLIERS - len(CURATED_SUPPLIERS))
    generated = generate_suppliers(extra, names)
    suppliers = CURATED_SUPPLIERS + generated
    print(f"\n📦 Seeding {len(suppliers)} suppliers "
          f"({len(CURATED_SUPPLIERS)} curated + {len(generated)} generated)...")

    print("  → Generating embeddings (batched)...")
    profile_texts = [build_profile_text(s) for s in suppliers]
    embeddings = embed_batch(profile_texts)

    supplier_docs = [
        {**s, "source": "user_added", "maps_place_id": None,
         "profile_embedding": emb, "created_at": datetime.now()}
        for s, emb in zip(suppliers, embeddings)
    ]

    result = db.suppliers.insert_many(supplier_docs)
    supplier_ids = list(result.inserted_ids)
    print(f"\n✅ Inserted {len(supplier_ids)} suppliers")

    # Create vector search index (Atlas only)
    try:
        db.command({
            "createSearchIndexes": "suppliers",
            "indexes": [{
                "name": "supplier_vector_index",
                "type": "vectorSearch",
                "definition": {
                    "fields": [{
                        "type": "vector",
                        "path": "profile_embedding",
                        "numDimensions": 768,
                        "similarity": "cosine"
                    }]
                }
            }]
        })
        print("✅ Vector search index created")
    except Exception as e:
        print(f"ℹ️  Vector index: {e} (may need to create in Atlas UI)")

    # ── Orders: curated Chukwuemeka demo orders + generated bulk ──────────────
    print("\n📋 Seeding orders...")
    chukwuemeka_id = supplier_ids[0]
    order_docs = [{
        **o,
        "supplier_id": chukwuemeka_id,
        "supplier_name": "Chukwuemeka Electronics",
        "created_at": datetime.now() - timedelta(days=random.randint(1, 7)),
        "updated_at": datetime.now(),
    } for o in CURATED_ORDERS]

    extra_orders = max(0, NUM_ORDERS - len(CURATED_ORDERS))
    order_docs += generate_orders(suppliers, supplier_ids, extra_orders)
    db.orders.insert_many(order_docs)
    print(f"✅ Inserted {len(order_docs)} orders")

    # ── Decision logs: 2 curated + generated history ──────────────────────────
    print("\n🗂️  Seeding decision logs...")
    log_docs = [
        {
            "disruption_type": "stockout",
            "affected_skus": ["SKU-ADP-301"],
            "original_supplier_id": chukwuemeka_id,
            "original_supplier_name": "Chukwuemeka Electronics",
            "chosen_supplier_id": supplier_ids[1],
            "chosen_supplier_name": "Techmart Supplies",
            "chosen_source": "user_db",
            "maps_results_used": False,
            "agent_rationale": "Techmart Supplies selected — 94% vector search match on consumer electronics, 2-day lead time within deadline, reliability 94/100.",
            "match_score": 0.94,
            "operator_approved": True,
            "time_to_resolve_s": 167,
            "time_to_resolve_mins": 3,
            "cost_delta_ngn": 32000,
            "additional_cost_ngn": 32000,
            "created_at": datetime.now() - timedelta(days=2),
        },
        {
            "disruption_type": "late",
            "affected_skus": ["SKU-SPK-401"],
            "original_supplier_id": chukwuemeka_id,
            "original_supplier_name": "Chukwuemeka Electronics",
            "chosen_supplier_name": "Lagos Electronics Hub",
            "chosen_source": "google_maps",
            "maps_results_used": True,
            "agent_rationale": "DB had < 3 results — Google Maps fallback used. Lagos Electronics Hub (★4.3, open now) selected. 3-day lead time, -5% price delta.",
            "match_score": 0.87,
            "operator_approved": True,
            "time_to_resolve_s": 203,
            "time_to_resolve_mins": 3,
            "cost_delta_ngn": -18000,
            "additional_cost_ngn": -18000,
            "created_at": datetime.now() - timedelta(days=5),
        },
    ]
    log_docs += generate_decision_logs(suppliers, supplier_ids, max(0, NUM_DECISION_LOGS - 2))
    db.decision_logs.insert_many(log_docs)
    print(f"✅ Inserted {len(log_docs)} decision logs")

    print("\n🎉 Database seeded successfully!")
    print(f"   Database:      {DB_NAME}")
    print(f"   Suppliers:     {len(supplier_ids)}")
    print(f"   Orders:        {len(order_docs)}")
    print(f"   Decision logs: {len(log_docs)}")
    print("\n📝 Next step: ensure the vector search index exists in MongoDB Atlas UI:")
    print("   Collection: suppliers")
    print("   Index name: supplier_vector_index")
    print("   Field: profile_embedding (768 dimensions, cosine similarity)")

    client.close()


if __name__ == "__main__":
    main()