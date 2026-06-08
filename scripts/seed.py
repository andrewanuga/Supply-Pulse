"""
SupplyPulse — MongoDB Seed Script with Real Embeddings
Run: python scripts/seed.py
Requires: pip install pymongo google-generativeai python-dotenv
"""
import os
import json
import time
from datetime import datetime, timedelta
import random
from dotenv import load_dotenv

load_dotenv()

try:
    from pymongo import MongoClient
    import google.generativeai as genai
except ImportError:
    print("Install dependencies: pip install pymongo google-generativeai python-dotenv")
    exit(1)

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME", "supplypulse")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not MONGO_URI:
    print("ERROR: MONGODB_URI not set in .env")
    exit(1)

genai.configure(api_key=GOOGLE_API_KEY)

SUPPLIERS = [
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


def get_embedding(text: str) -> list[float]:
    """Generate embedding using Google's text-embedding-004"""
    try:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text
        )
        return result["embedding"]
    except Exception as e:
        print(f"  Embedding error: {e}, using random fallback")
        return [random.gauss(0, 0.1) for _ in range(768)]


def build_profile_text(supplier: dict) -> str:
    """Build a rich text description for embedding"""
    return (
        f"Supplier: {supplier['name']}. "
        f"Categories: {', '.join(supplier['category'])}. "
        f"Products: {', '.join(supplier['products'])}. "
        f"Location: {supplier['location']['city']}, {supplier['location']['state']}, Nigeria. "
        f"Lead time: {supplier['lead_time_days']} days. "
        f"Price tier: {supplier['price_tier']}. "
        f"Reliability: {supplier['reliability_score']}/100."
    )


def main():
    print("🔌 Connecting to MongoDB...")
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    print("🗑️  Clearing existing collections...")
    db.suppliers.delete_many({})
    db.orders.delete_many({})
    db.decision_logs.delete_many({})

    print(f"\n📦 Seeding {len(SUPPLIERS)} suppliers with embeddings...")
    supplier_docs = []
    for i, s in enumerate(SUPPLIERS):
        print(f"  [{i+1}/{len(SUPPLIERS)}] {s['name']}...", end=" ", flush=True)
        profile_text = build_profile_text(s)
        embedding = get_embedding(profile_text)
        doc = {**s, "source": "user_added", "maps_place_id": None, "profile_embedding": embedding, "created_at": datetime.now()}
        supplier_docs.append(doc)
        print(f"✓ ({len(embedding)}d)")
        time.sleep(0.1)  # Rate limit

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

    # Seed orders
    print("\n📋 Seeding orders...")
    orders = [
        {"sku": "SKU-REM-800", "product_name": "TV Remote Controls (Universal)", "quantity": 300, "unit_price": 2500, "deadline": "2026-06-13", "status": "pending"},
        {"sku": "SKU-REM-801", "product_name": "Set-Top Box Remote Controls", "quantity": 250, "unit_price": 3200, "deadline": "2026-06-13", "status": "pending"},
        {"sku": "SKU-REM-802", "product_name": "Smart TV Remote Controls", "quantity": 250, "unit_price": 4500, "deadline": "2026-06-14", "status": "pending"},
        {"sku": "SKU-CBL-101", "product_name": "HDMI Cables 2m", "quantity": 500, "unit_price": 1800, "deadline": "2026-06-15", "status": "pending"},
        {"sku": "SKU-PWR-201", "product_name": "Power Banks 10000mAh", "quantity": 150, "unit_price": 8500, "deadline": "2026-06-20", "status": "pending"},
        {"sku": "SKU-ADP-301", "product_name": "USB-C Adapters", "quantity": 400, "unit_price": 2200, "deadline": "2026-06-18", "status": "fulfilled"},
        {"sku": "SKU-SPK-401", "product_name": "Bluetooth Speakers Mini", "quantity": 100, "unit_price": 12000, "deadline": "2026-06-25", "status": "fulfilled"},
    ]

    chukwuemeka_id = supplier_ids[0]
    order_docs = [{
        **o,
        "supplier_id": chukwuemeka_id,
        "supplier_name": "Chukwuemeka Electronics",
        "created_at": datetime.now() - timedelta(days=random.randint(1, 7)),
        "updated_at": datetime.now(),
    } for o in orders]

    db.orders.insert_many(order_docs)
    print(f"✅ Inserted {len(order_docs)} orders")

    # Sample decision logs (v3 schema)
    db.decision_logs.insert_many([
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
    ])
    print("✅ Sample decision logs inserted (v3 schema with source tracking)")

    print("\n🎉 Database seeded successfully!")
    print(f"   Database: {DB_NAME}")
    print(f"   Suppliers: {len(supplier_ids)}")
    print(f"   Orders: {len(order_docs)}")
    print("\n📝 Next step: Create vector search index in MongoDB Atlas UI:")
    print("   Collection: suppliers")
    print("   Index name: supplier_vector_index")
    print("   Field: profile_embedding (768 dimensions, cosine similarity)")

    client.close()


if __name__ == "__main__":
    main()
