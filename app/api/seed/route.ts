import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

const SUPPLIERS = [
  { name: "Chukwuemeka Electronics", category: ["electronics", "consumer_goods"], products: ["TV remotes", "set-top boxes", "power banks", "charging cables"], location: { city: "Lagos", state: "Lagos" }, lead_time_days: 2, price_tier: "mid", reliability_score: 72, contact_email: "chukwuemeka@example.com" },
  { name: "Techmart Supplies", category: ["electronics", "gadgets"], products: ["remote controls", "consumer electronics", "TV accessories", "gadgets"], location: { city: "Lagos", state: "Lagos" }, lead_time_days: 2, price_tier: "mid", reliability_score: 94, contact_email: "techmart@example.com" },
  { name: "Lagos Electronics Hub", category: ["electronics", "FMCG"], products: ["electronics accessories", "TV remotes", "cables", "adapters"], location: { city: "Lagos", state: "Lagos" }, lead_time_days: 3, price_tier: "budget", reliability_score: 87, contact_email: "lagoselec@example.com" },
  { name: "Gadget Wholesale Ltd", category: ["electronics", "wholesale"], products: ["remote controls", "gadgets", "consumer electronics", "batteries"], location: { city: "Ikeja", state: "Lagos" }, lead_time_days: 4, price_tier: "budget", reliability_score: 71, contact_email: "gadgetwholesale@example.com" },
  { name: "Abuja Tech Traders", category: ["electronics", "tech"], products: ["electronics", "computers", "phones", "accessories"], location: { city: "Abuja", state: "FCT" }, lead_time_days: 3, price_tier: "premium", reliability_score: 89, contact_email: "abujatech@example.com" },
  { name: "Port Harcourt Distributors", category: ["FMCG", "wholesale"], products: ["consumer goods", "household items", "food products", "beverages"], location: { city: "Port Harcourt", state: "Rivers" }, lead_time_days: 5, price_tier: "budget", reliability_score: 78, contact_email: "phdist@example.com" },
  { name: "Kano Central Supplies", category: ["FMCG", "textiles"], products: ["fabrics", "clothing", "household goods", "provisions"], location: { city: "Kano", state: "Kano" }, lead_time_days: 4, price_tier: "budget", reliability_score: 82, contact_email: "kanosupplies@example.com" },
  { name: "Surulere Electronics", category: ["electronics", "appliances"], products: ["home appliances", "electronics", "TVs", "refrigerators"], location: { city: "Lagos", state: "Lagos" }, lead_time_days: 3, price_tier: "mid", reliability_score: 85, contact_email: "surulere@example.com" },
  { name: "Alaba Int'l Market Hub", category: ["electronics", "wholesale", "gadgets"], products: ["all electronics", "phones", "laptops", "accessories", "remote controls"], location: { city: "Lagos", state: "Lagos" }, lead_time_days: 1, price_tier: "budget", reliability_score: 76, contact_email: "alaba@example.com" },
  { name: "Premium Tech Vendors", category: ["electronics", "premium"], products: ["high-end electronics", "smart devices", "premium accessories"], location: { city: "Victoria Island", state: "Lagos" }, lead_time_days: 2, price_tier: "premium", reliability_score: 96, contact_email: "premiumtech@example.com" },
  { name: "Enugu Wholesale Center", category: ["FMCG", "wholesale"], products: ["provisions", "food items", "beverages", "household goods"], location: { city: "Enugu", state: "Enugu" }, lead_time_days: 6, price_tier: "budget", reliability_score: 80, contact_email: "enuguwholesale@example.com" },
  { name: "Onitsha Bridge Market", category: ["textiles", "FMCG", "wholesale"], products: ["fabrics", "clothing", "food", "general merchandise"], location: { city: "Onitsha", state: "Anambra" }, lead_time_days: 5, price_tier: "budget", reliability_score: 74, contact_email: "onitshabridge@example.com" },
  { name: "Kaduna Industrial Supply", category: ["industrial", "manufacturing"], products: ["industrial parts", "machinery components", "raw materials"], location: { city: "Kaduna", state: "Kaduna" }, lead_time_days: 7, price_tier: "mid", reliability_score: 88, contact_email: "kadunaind@example.com" },
  { name: "Ibadan Mega Stores", category: ["FMCG", "retail", "wholesale"], products: ["consumer goods", "food", "beverages", "household items"], location: { city: "Ibadan", state: "Oyo" }, lead_time_days: 3, price_tier: "mid", reliability_score: 83, contact_email: "ibadanmega@example.com" },
  { name: "Warri Petroleum Products", category: ["petroleum", "industrial"], products: ["lubricants", "petroleum products", "industrial fluids"], location: { city: "Warri", state: "Delta" }, lead_time_days: 5, price_tier: "premium", reliability_score: 91, contact_email: "warripetro@example.com" },
];

const ORDERS = [
  { sku: "SKU-REM-800", product_name: "TV Remote Controls (Universal)", quantity: 300, unit_price: 2500, deadline: "2026-06-13", status: "pending" },
  { sku: "SKU-REM-801", product_name: "Set-Top Box Remote Controls", quantity: 250, unit_price: 3200, deadline: "2026-06-13", status: "pending" },
  { sku: "SKU-REM-802", product_name: "Smart TV Remote Controls", quantity: 250, unit_price: 4500, deadline: "2026-06-14", status: "pending" },
  { sku: "SKU-CBL-101", product_name: "HDMI Cables 2m", quantity: 500, unit_price: 1800, deadline: "2026-06-15", status: "pending" },
  { sku: "SKU-PWR-201", product_name: "Power Banks 10000mAh", quantity: 150, unit_price: 8500, deadline: "2026-06-20", status: "pending" },
  { sku: "SKU-ADP-301", product_name: "USB-C Adapters", quantity: 400, unit_price: 2200, deadline: "2026-06-18", status: "fulfilled" },
  { sku: "SKU-SPK-401", product_name: "Bluetooth Speakers Mini", quantity: 100, unit_price: 12000, deadline: "2026-06-25", status: "fulfilled" },
];

export async function POST() {
  try {
    const suppliers = await getCollection("suppliers");
    const orders = await getCollection("orders");
    const logs = await getCollection("decision_logs");

    // Clear existing
    await suppliers.deleteMany({});
    await orders.deleteMany({});
    await logs.deleteMany({});

    // Insert suppliers with v3 schema (source, maps_place_id)
    const supplierDocs = SUPPLIERS.map((s) => ({
      ...s,
      source: "user_added",
      maps_place_id: null,
      profile_embedding: Array(768).fill(0).map(() => Math.random() - 0.5),
      created_at: new Date(),
    }));
    const supplierResult = await suppliers.insertMany(supplierDocs);
    const supplierIds = Object.values(supplierResult.insertedIds);

    // Insert orders linked to first supplier (Chukwuemeka)
    const chukwuemekaId = supplierIds[0];
    const orderDocs = ORDERS.map((o) => ({
      ...o,
      supplier_id: chukwuemekaId,
      supplier_name: "Chukwuemeka Electronics",
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      updated_at: new Date(),
    }));
    await orders.insertMany(orderDocs);

    // Insert sample decision logs (v3 schema)
    await logs.insertMany([
      {
        disruption_type: "stockout",
        affected_skus: ["SKU-ADP-301"],
        original_supplier_id: chukwuemekaId,
        original_supplier_name: "Chukwuemeka Electronics",
        chosen_supplier_id: supplierIds[1],
        chosen_supplier_name: "Techmart Supplies",
        chosen_source: "user_db",
        maps_results_used: false,
        agent_rationale: "Techmart Supplies selected — 94% vector search match on consumer electronics, 2-day lead time within deadline, reliability score 94/100. Located in Lagos.",
        match_score: 0.94,
        operator_approved: true,
        time_to_resolve_s: 167,
        time_to_resolve_mins: 3,
        cost_delta_ngn: 32000,
        additional_cost_ngn: 32000,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        disruption_type: "late",
        affected_skus: ["SKU-SPK-401"],
        original_supplier_id: chukwuemekaId,
        original_supplier_name: "Chukwuemeka Electronics",
        chosen_supplier_name: "Lagos Electronics Hub",
        chosen_source: "google_maps",
        maps_results_used: true,
        agent_rationale: "No DB match with 3+ results — Google Maps fallback used. Lagos Electronics Hub (★4.3, open now) selected. 3-day lead time, -5% price delta.",
        match_score: 0.87,
        operator_approved: true,
        time_to_resolve_s: 203,
        time_to_resolve_mins: 3,
        cost_delta_ngn: -18000,
        additional_cost_ngn: -18000,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ]);

    return NextResponse.json({
      success: true,
      suppliers: supplierResult.insertedCount,
      orders: orderDocs.length,
      message: "Database seeded successfully",
    });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
