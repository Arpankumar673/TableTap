"use client";

import React, { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Download, TrendingUp, DollarSign, ShoppingBag, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export interface AnalyticsOrderData {
  id: string;
  order_number: string;
  table_number_snapshot: string | null;
  status: string;
  payment_status: string;
  subtotal: number;
  tax: number;
  service_charge: number;
  total: number;
  created_at: string;
  items: Array<{
    product_name_snapshot: string;
    quantity: number;
    total_price_snapshot: number;
    category_name: string;
  }>;
}

interface AnalyticsViewProps {
  restaurantName: string;
  currency: string;
  totalTables: number;
  orders: AnalyticsOrderData[];
}

export function AnalyticsView({
  restaurantName,
  currency,
  totalTables,
  orders,
}: AnalyticsViewProps) {
  const [range, setRange] = useState<"today" | "7d" | "30d" | "all">("30d");

  const filteredOrders = useMemo(() => {
    const now = new Date();
    let cutoff = new Date(0);
    if (range === "today") {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === "7d") {
      cutoff = new Date(now.getTime() - 7 * 86400_000);
    } else if (range === "30d") {
      cutoff = new Date(now.getTime() - 30 * 86400_000);
    }
    return orders.filter((o) => new Date(o.created_at) >= cutoff);
  }, [orders, range]);

  const metrics = useMemo(() => {
    const placed = filteredOrders.length;
    const cancelled = filteredOrders.filter((o) => o.status === "cancelled").length;
    const valid = filteredOrders.filter((o) => o.status !== "cancelled");
    const completed = valid.filter((o) =>
      o.status === "completed"
    ).length;
    const paidOrders = valid.filter((o) => o.payment_status === "paid");

    const grossSales = valid.reduce((s, o) => s + o.total, 0);
    const paidSales = paidOrders.reduce((s, o) => s + o.total, 0);
    const aov = valid.length > 0 ? grossSales / valid.length : 0;

    // Daily breakdown
    const dailyMap = new Map<string, { date: string; revenue: number; orders: number }>();
    const hourlyMap = new Map<number, number>();
    const categoryMap = new Map<string, { name: string; revenue: number; qty: number }>();
    const productMap = new Map<string, { name: string; revenue: number; qty: number }>();
    const activeTablesSet = new Set<string>();

    for (const o of valid) {
      if (o.table_number_snapshot) activeTablesSet.add(o.table_number_snapshot);

      const d = new Date(o.created_at);
      const dayKey = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const prevDay = dailyMap.get(dayKey) ?? { date: dayLabel, revenue: 0, orders: 0 };
      prevDay.revenue += o.total;
      prevDay.orders += 1;
      dailyMap.set(dayKey, prevDay);

      const hr = d.getHours();
      hourlyMap.set(hr, (hourlyMap.get(hr) ?? 0) + 1);

      for (const it of o.items) {
        const catPrev = categoryMap.get(it.category_name) ?? {
          name: it.category_name,
          revenue: 0,
          qty: 0,
        };
        catPrev.revenue += it.total_price_snapshot;
        catPrev.qty += it.quantity;
        categoryMap.set(it.category_name, catPrev);

        const prodPrev = productMap.get(it.product_name_snapshot) ?? {
          name: it.product_name_snapshot,
          revenue: 0,
          qty: 0,
        };
        prodPrev.revenue += it.total_price_snapshot;
        prodPrev.qty += it.quantity;
        productMap.set(it.product_name_snapshot, prodPrev);
      }
    }

    const dailyTrend = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, val]) => ({
        date: val.date,
        revenue: Math.round(val.revenue),
        orders: val.orders,
      }));

    const peakHours = Array.from({ length: 24 }, (_, hr) => ({
      hour: `${hr.toString().padStart(2, "0")}:00`,
      orders: hourlyMap.get(hr) ?? 0,
    })).filter((h) => h.orders > 0);

    const categoryPerf = Array.from(categoryMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map((c) => ({ ...c, revenue: Math.round(c.revenue) }));

    const productPerf = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const tableUtilPct =
      totalTables > 0
        ? Math.min(100, Math.round((activeTablesSet.size / totalTables) * 100))
        : 0;

    return {
      placed,
      completed,
      cancelled,
      grossSales,
      paidSales,
      aov,
      dailyTrend,
      peakHours,
      categoryPerf,
      productPerf,
      tableUtilPct,
    };
  }, [filteredOrders, totalTables]);

  function exportCsv() {
    const header = [
      "Order Number",
      "Table",
      "Status",
      "Payment Status",
      "Subtotal",
      "Tax",
      "Service Charge",
      "Total",
      "Created At",
    ];
    const rows = filteredOrders.map((o) => [
      o.order_number,
      o.table_number_snapshot ?? "",
      o.status,
      o.payment_status,
      o.subtotal.toFixed(2),
      o.tax.toFixed(2),
      o.service_charge.toFixed(2),
      o.total.toFixed(2),
      new Date(o.created_at).toISOString(),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${restaurantName.toLowerCase().replace(/\s+/g, "-")}-sales-report-${range}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
            Analytics &amp; Business Reports
          </h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-forest-700/80">
            Canonical order revenue, peak dining hours, and product performance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="inline-flex rounded-xl border border-cream-200 bg-white p-1 overflow-x-auto scrollbar-none max-w-full">
            {(
              [
                { key: "today", label: "Today" },
                { key: "7d", label: "7 Days" },
                { key: "30d", label: "30 Days" },
                { key: "all", label: "All Time" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRange(opt.key)}
                className={`rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold transition-colors shrink-0 ${
                  range === opt.key
                    ? "bg-forest-800 text-white"
                    : "text-forest-800 hover:bg-cream-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={exportCsv} className="text-xs h-9">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <div className="flex items-center justify-between text-xs font-medium text-forest-700">
              <span className="truncate">Gross Sales</span>
              <DollarSign className="h-4 w-4 text-forest-700 shrink-0" />
            </div>
            <div className="mt-1.5 sm:mt-2 font-serif text-xl sm:text-2xl font-bold text-forest-950">
              {formatCurrency(metrics.grossSales, currency)}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs text-emerald-700 font-medium truncate">
              Paid: {formatCurrency(metrics.paidSales, currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <div className="flex items-center justify-between text-xs font-medium text-forest-700">
              <span className="truncate">Order Volume</span>
              <ShoppingBag className="h-4 w-4 text-forest-700 shrink-0" />
            </div>
            <div className="mt-1.5 sm:mt-2 font-serif text-xl sm:text-2xl font-bold text-forest-950">
              {metrics.placed}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs text-forest-700 truncate">
              Completed: {metrics.completed}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <div className="flex items-center justify-between text-xs font-medium text-forest-700">
              <span className="truncate">Avg Order Value</span>
              <TrendingUp className="h-4 w-4 text-forest-700 shrink-0" />
            </div>
            <div className="mt-1.5 sm:mt-2 font-serif text-xl sm:text-2xl font-bold text-forest-950">
              {formatCurrency(metrics.aov, currency)}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs text-forest-700 truncate">
              Table utilization: {metrics.tableUtilPct}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 sm:p-5">
            <div className="flex items-center justify-between text-xs font-medium text-forest-700">
              <span className="truncate">Cancelled Orders</span>
              <Ban className="h-4 w-4 text-tomato-600 shrink-0" />
            </div>
            <div className="mt-1.5 sm:mt-2 font-serif text-xl sm:text-2xl font-bold text-forest-950">
              {metrics.cancelled}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs text-forest-700 truncate">
              Excluded from sales
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="font-serif text-base sm:text-lg">Revenue Over Time</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Daily sales performance</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {metrics.dailyTrend.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-xs text-forest-700/70">
                No order data in selected date range.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2D5BC" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val) => [
                        formatCurrency(Number(val ?? 0), currency),
                        "Revenue",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#1B5E3A"
                      fill="#DCEEE3"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="font-serif text-base sm:text-lg">Peak Ordering Hours</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Orders grouped by hour of day</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {metrics.peakHours.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-xs text-forest-700/70">
                No hourly order volume recorded yet.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.peakHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2D5BC" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#F58220" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category & Product Performance */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="font-serif text-base sm:text-lg">Category Performance</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Revenue contribution per menu category</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {metrics.categoryPerf.length === 0 ? (
              <div className="py-12 text-center text-xs text-forest-700/70">
                No category data yet.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.categoryPerf} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2D5BC" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(val) => [
                        formatCurrency(Number(val ?? 0), currency),
                        "Revenue",
                      ]}
                    />
                    <Bar dataKey="revenue" fill="#1B5E3A" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Top Product Performance</CardTitle>
            <CardDescription>Best-selling menu items</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.productPerf.length === 0 ? (
              <div className="py-12 text-center text-xs text-forest-700/70">
                No product sales data yet.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {metrics.productPerf.map((p, idx) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between rounded-xl border border-cream-200 bg-cream-50/40 px-3.5 py-2 text-sm"
                  >
                    <div>
                      <span className="font-bold text-forest-950">
                        {idx + 1}. {p.name}
                      </span>
                      <div className="text-xs text-forest-700">{p.qty} units sold</div>
                    </div>
                    <span className="font-bold text-forest-900">
                      {formatCurrency(p.revenue, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
