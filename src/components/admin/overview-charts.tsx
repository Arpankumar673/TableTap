"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface DailyTrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

export function OverviewSalesChart({
  data,
  currency,
}: {
  data: DailyTrendPoint[];
  currency: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-cream-300 bg-cream-50/40 text-sm text-forest-700/70">
        Sales trends will appear once orders are placed.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1B5E3A" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#1B5E3A" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2D5BC" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#143725" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#143725" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatCurrency(Number(v), currency)}
          />
          <Tooltip
            formatter={(value) => [
              formatCurrency(Number(value ?? 0), currency),
              "Revenue",
            ]}
            contentStyle={{
              borderRadius: "0.75rem",
              borderColor: "#E2D5BC",
              fontSize: "12px",
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#1B5E3A"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#revenueFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
