import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export async function GET() {
  try {
    const orders = await getCollection("orders");
    const suppliers = await getCollection("suppliers");

    const allOrders = await orders
      .find({})
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();

    const supplierIds = [...new Set(allOrders.map((o) => o.supplier_id?.toString()))];
    const supplierList = await suppliers
      .find({ _id: { $in: supplierIds as never[] } })
      .toArray();

    const supplierMap = Object.fromEntries(
      supplierList.map((s) => [s._id.toString(), s.name])
    );

    const enriched = allOrders.map((o) => ({
      ...o,
      _id: o._id.toString(),
      supplier_id: o.supplier_id?.toString(),
      supplier_name: supplierMap[o.supplier_id?.toString()] || o.supplier_name || "Unknown",
    }));

    const totalValue = enriched.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum, o: any) => sum + ((o.quantity ?? 0) * (o.unit_price ?? 0)),
      0
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byStatus = enriched.reduce((acc: Record<string, number>, o: any) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({ orders: enriched, totalValue, byStatus });
  } catch (err) {
    // Return empty data so dashboard still renders
    return NextResponse.json({ orders: [], totalValue: 0, byStatus: {}, error: String(err) });
  }
}
