import { requireStaffRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  AdminOverviewView,
  AdminOverviewInitialData,
  PopularProduct,
  SalesTrendPoint,
  OverviewOrder,
} from "@/components/admin/admin-overview-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Overview | TableTap",
};

export default async function AdminOverviewPage() {
  const ctx = await requireStaffRole(["admin"]);
  const supabase = await createServerSupabaseClient();
  const currency = ctx.settings.currency || "INR";

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { data: ordersData },
    { data: tablesData },
    { data: activeSessionsData },
    { data: popularItemsData },
    { count: productsCount },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, table_number_snapshot, status, payment_status, total, created_at")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("tables")
      .select("id, active")
      .eq("active", true),
    supabase
      .from("table_sessions")
      .select("id, table_id, bill_requested")
      .eq("status", "open"),
    supabase
      .from("order_items")
      .select("product_name_snapshot, quantity, total_price_snapshot")
      .neq("status", "cancelled")
      .limit(300),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true }),
  ]);

  const orders = ordersData ?? [];
  const nonCancelled = orders.filter((o) => o.status !== "cancelled");

  const todayOrders = nonCancelled.filter(
    (o) => new Date(o.created_at) >= todayStart
  );
  const todaysRevenue = todayOrders.reduce(
    (sum, o) => sum + Number(o.total),
    0
  );

  const pendingCount = orders.filter((o) => o.status === "new").length;
  const preparingCount = orders.filter((o) =>
    ["accepted", "preparing"].includes(o.status)
  ).length;
  const completedCount = orders.filter((o) =>
    ["ready", "completed"].includes(o.status)
  ).length;

  const totalTables = (tablesData ?? []).length;
  const activeTablesCount = new Set(
    (activeSessionsData ?? []).map((s) => s.table_id)
  ).size;
  const billRequestsCount = (activeSessionsData ?? []).filter(
    (s) => s.bill_requested
  ).length;

  // Build 7-day daily trend buckets
  const dayBuckets = new Map<string, { revenue: number; orders: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dayBuckets.set(label, { revenue: 0, orders: 0 });
  }
  for (const o of nonCancelled) {
    const label = new Date(o.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const bucket = dayBuckets.get(label);
    if (bucket) {
      bucket.revenue += Number(o.total);
      bucket.orders += 1;
    }
  }
  const salesTrend: SalesTrendPoint[] = Array.from(dayBuckets.entries()).map(([date, val]) => ({
    date,
    revenue: Math.round(val.revenue),
    orders: val.orders,
  }));

  // Top popular products from real order_items
  const prodTally = new Map<string, { qty: number; revenue: number }>();
  for (const item of popularItemsData ?? []) {
    const prev = prodTally.get(item.product_name_snapshot) ?? {
      qty: 0,
      revenue: 0,
    };
    prev.qty += item.quantity;
    prev.revenue += Number(item.total_price_snapshot);
    prodTally.set(item.product_name_snapshot, prev);
  }
  const topProducts: PopularProduct[] = Array.from(prodTally.entries())
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5)
    .map(([name, info]) => ({
      name,
      qty: info.qty,
      revenue: info.revenue,
    }));

  const recentOrders: OverviewOrder[] = orders.slice(0, 8).map((ord) => ({
    id: ord.id,
    order_number: ord.order_number,
    table_number_snapshot: ord.table_number_snapshot,
    status: ord.status,
    payment_status: ord.payment_status,
    total: Number(ord.total),
    created_at: ord.created_at,
  }));

  const initialData: AdminOverviewInitialData = {
    restaurantName: ctx.settings.name,
    currency,
    todayOrdersCount: todayOrders.length,
    todaysRevenue,
    pendingCount,
    preparingCount,
    completedCount,
    activeTablesCount,
    totalTables,
    billRequestsCount,
    productsCount: productsCount ?? 0,
    salesTrend,
    topProducts,
    recentOrders,
  };

  return <AdminOverviewView initialData={initialData} />;
}
