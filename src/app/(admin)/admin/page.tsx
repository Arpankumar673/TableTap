import Link from "next/link";
import {
  DollarSign,
  UtensilsCrossed,
  QrCode,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import dynamicImport from "next/dynamic";
import { requireStaffRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const OverviewSalesChart = dynamicImport(
  () =>
    import("@/components/admin/overview-charts").then(
      (m) => m.OverviewSalesChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-cream-200 bg-cream-50/50">
        <div className="h-4 w-32 animate-pulse rounded bg-cream-200" />
      </div>
    ),
  }
);

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
  const salesTrend = Array.from(dayBuckets.entries()).map(([date, val]) => ({
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
  const topProducts = Array.from(prodTally.entries())
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5);

  const recentOrders = orders.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-espresso-950">
            Restaurant Overview
          </h1>
          <p className="mt-1 text-sm text-espresso-700/80">
            Live operations, table occupancy, and sales for {ctx.settings.name}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button asChild variant="outline" size="sm" className="border-cream-300">
            <Link href="/admin/qr">
              <QrCode className="mr-1.5 h-4 w-4 text-burgundy-700" />
              <span>Table QR Manager</span>
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-burgundy-800 hover:bg-burgundy-900 text-cream-50">
            <Link href="/admin/menu">
              <UtensilsCrossed className="mr-1.5 h-4 w-4" />
              <span>Menu Management</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Setup Banner if Menu is Empty */}
      {(productsCount ?? 0) === 0 && (
        <Card className="border-spice-300 bg-spice-50/70">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-6 w-6 text-spice-600" />
              <div>
                <h2 className="font-serif text-lg font-bold text-forest-950">
                  Your digital menu is currently empty
                </h2>
                <p className="text-sm text-forest-800/80">
                  Go to Menu Management to create your dishes or use our 1-Click Boston &amp; Co. American Eatery Seeder to instantly populate smash burgers, sourdough pizzas, loaded fries, shakes, preparation stations, and starter tables.
                </p>
              </div>
            </div>
            <Button asChild variant="spice">
              <Link href="/admin/menu">
                <span>Setup Menu &amp; Sample Data</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bill Requests Alert */}
      {billRequestsCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-spice-300 bg-spice-50 px-4 py-3 text-sm text-spice-950">
          <span className="font-semibold">
            {billRequestsCount} active table(s) have requested their bill!
          </span>
          <Link
            href="/admin/tables"
            className="text-xs font-bold underline underline-offset-4"
          >
            View Tables →
          </Link>
        </div>
      )}

      {/* Primary KPI Grid: 6 Specified Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* 1. Today's Orders */}
        <Card className="border-cream-200/90 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-espresso-700">
              <span>Today&apos;s Orders</span>
              <UtensilsCrossed className="h-4 w-4 text-burgundy-700" />
            </div>
            <div className="mt-2 font-serif text-2xl font-bold text-espresso-950">
              {todayOrders.length}
            </div>
            <div className="mt-1 text-[11px] text-espresso-600/80">
              Placed since midnight
            </div>
          </CardContent>
        </Card>

        {/* 2. Today's Revenue */}
        <Card className="border-cream-200/90 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-espresso-700">
              <span>Today&apos;s Revenue</span>
              <DollarSign className="h-4 w-4 text-burgundy-700" />
            </div>
            <div className="mt-2 font-serif text-2xl font-bold text-burgundy-800">
              {formatCurrency(todaysRevenue, currency)}
            </div>
            <div className="mt-1 text-[11px] text-espresso-600/80">
              Gross sales today
            </div>
          </CardContent>
        </Card>

        {/* 3. Pending Orders */}
        <Card className="border-cream-200/90 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-espresso-700">
              <span>Pending Orders</span>
              <Clock className="h-4 w-4 text-gold-600" />
            </div>
            <div className="mt-2 font-serif text-2xl font-bold text-espresso-950">
              {pendingCount}
            </div>
            <div className="mt-1 text-[11px] text-gold-700 font-medium">
              New tickets to accept
            </div>
          </CardContent>
        </Card>

        {/* 4. Preparing Orders */}
        <Card className="border-cream-200/90 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-espresso-700">
              <span>Preparing Orders</span>
              <Sparkles className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2 font-serif text-2xl font-bold text-espresso-950">
              {preparingCount}
            </div>
            <div className="mt-1 text-[11px] text-blue-700 font-medium">
              Active in kitchen stations
            </div>
          </CardContent>
        </Card>

        {/* 5. Completed Orders */}
        <Card className="border-cream-200/90 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-espresso-700">
              <span>Completed Orders</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 font-serif text-2xl font-bold text-espresso-950">
              {completedCount}
            </div>
            <div className="mt-1 text-[11px] text-emerald-700 font-medium">
              Served &amp; completed
            </div>
          </CardContent>
        </Card>

        {/* 6. Active Tables */}
        <Card className="border-cream-200/90 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-espresso-700">
              <span>Active Tables</span>
              <QrCode className="h-4 w-4 text-burgundy-700" />
            </div>
            <div className="mt-2 font-serif text-2xl font-bold text-espresso-950">
              {activeTablesCount} / {totalTables}
            </div>
            <div className="mt-1 text-[11px] text-espresso-600/80">
              Open dining sessions
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Popular Products */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="font-serif text-xl">
              7-Day Sales Trend
            </CardTitle>
            <CardDescription>
              Canonical order totals recorded in PostgreSQL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OverviewSalesChart data={salesTrend} currency={currency} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-serif text-xl">
              Popular Dishes
            </CardTitle>
            <CardDescription>Top ordered items by quantity</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="py-10 text-center text-xs text-forest-700/70">
                No ordered items recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {topProducts.map(([name, info], idx) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-xl border border-cream-200 bg-cream-50/40 px-3.5 py-2.5"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate text-sm font-semibold text-forest-950">
                        {idx + 1}. {name}
                      </div>
                      <div className="text-xs text-forest-700">
                        {info.qty} ordered
                      </div>
                    </div>
                    <div className="text-sm font-bold text-forest-900">
                      {formatCurrency(info.revenue, currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-serif text-xl">Recent Orders</CardTitle>
            <CardDescription>Latest table submissions</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/orders">View All →</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="py-8 text-center text-sm text-forest-700/75">
              No orders placed yet. Scan a table QR code to place your first test order!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cream-200 text-xs uppercase text-forest-700">
                    <th className="py-2.5 pr-4">Order #</th>
                    <th className="py-2.5 pr-4">Table</th>
                    <th className="py-2.5 pr-4">Status</th>
                    <th className="py-2.5 pr-4">Payment</th>
                    <th className="py-2.5 pr-4">Total</th>
                    <th className="py-2.5">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-100">
                  {recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-cream-50/50">
                      <td className="py-3 pr-4 font-mono font-bold text-forest-950">
                        {ord.order_number}
                      </td>
                      <td className="py-3 pr-4">
                        Table {ord.table_number_snapshot ?? "-"}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="secondary" className="capitalize">
                          {ord.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={ord.payment_status === "paid" ? "veg" : "outline"}
                          className="capitalize"
                        >
                          {ord.payment_status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 font-semibold">
                        {formatCurrency(Number(ord.total), currency)}
                      </td>
                      <td className="py-3 text-xs text-forest-700">
                        {new Date(ord.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
