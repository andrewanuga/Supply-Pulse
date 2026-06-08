import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export async function GET() {
  try {
    const logs = await getCollection("decision_logs");
    const orders = await getCollection("orders");

    const recentLogs = await logs
      .find({})
      .sort({ created_at: -1 })
      .limit(20)
      .toArray();

    const atRiskOrders = await orders
      .find({ status: { $in: ["at_risk", "pending"] } })
      .limit(10)
      .toArray();

    const resolvedCount = await logs.countDocuments({ operator_approved: true });
    const avgResolveTime = await logs
      .aggregate([
        { $group: { _id: null, avg: { $avg: "$time_to_resolve_mins" } } },
      ])
      .toArray();

    return NextResponse.json({
      recentLogs: recentLogs.map((l) => ({
        ...l,
        _id: l._id.toString(),
        original_supplier_id: l.original_supplier_id?.toString(),
        chosen_supplier_id: l.chosen_supplier_id?.toString(),
      })),
      atRiskOrders: atRiskOrders.map((o) => ({
        ...o,
        _id: o._id.toString(),
        supplier_id: o.supplier_id?.toString(),
      })),
      stats: {
        resolvedCount,
        avgResolveTimeMins: Math.round(avgResolveTime[0]?.avg || 0),
        activeDisruptions: atRiskOrders.length,
      },
    });
  } catch (err) {
    console.error("Disruptions fetch error:", err);
    // Return empty data instead of 500 so the dashboard still renders
    return NextResponse.json({
      recentLogs: [],
      atRiskOrders: [],
      stats: { resolvedCount: 0, avgResolveTimeMins: 0, activeDisruptions: 0 },
      error: String(err),
    });
  }
}
