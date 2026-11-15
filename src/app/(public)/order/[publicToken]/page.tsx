"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChefHat,
  Clock,
  Banknote,
  Loader2,
  PackageCheck,
  Receipt,
  RefreshCw,
  UtensilsCrossed,
  XCircle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { OrderItemStatus, OrderStatus, PaymentStatus } from "@/types/orders";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BostonLogo } from "@/components/shared/boston-logo";
import { motion } from "framer-motion";

interface TrackedOrder {
  id: string;
  order_number: string;
  public_token: string;
  table_number: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  discount: number;
  tax: number;
  service_charge: number;
  total: number;
  customer_notes: string | null;
  created_at: string;
  updated_at: string;
  restaurant_name: string;
  currency: string;
  restaurant_phone: string | null;
  items: Array<{
    id: string;
    product_name: string;
    variant_name: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    station_name: string | null;
    notes: string | null;
    status: OrderItemStatus;
    options: Array<{
      group_name: string;
      value_name: string;
      price_delta: number;
    }>;
  }>;
  events: Array<{
    from_status: string | null;
    to_status: string;
    reason: string | null;
    created_at: string;
  }>;
}

const TRACKING_STEPS: Array<{
  key: OrderStatus;
  label: string;
  description: string;
}> = [
  { key: "new", label: "Order Placed", description: "Sent to restaurant" },
  { key: "accepted", label: "Accepted", description: "Kitchen confirmed" },
  { key: "preparing", label: "Preparing", description: "Chef is cooking" },
  { key: "ready", label: "Ready", description: "Plated & hot" },
  { key: "completed", label: "Completed", description: "Served & settled" },
];

function getStepIndex(status: OrderStatus): number {
  return TRACKING_STEPS.findIndex((s) => s.key === status);
}

export default function OrderTrackingPage({
  params,
}: {
  params: { publicToken: string };
}) {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    const { isConfigured } = getSupabasePublicEnv();
    if (!isConfigured) {
      setError("Supabase connection is not configured.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc(
        "get_order_by_public_token",
        { p_public_token: params.publicToken }
      );

      if (rpcError || !data) {
        setError("Order not found or tracking link expired.");
      } else {
        setOrder(data as unknown as TrackedOrder);
        setError(null);
      }
    } catch {
      setError("Unable to load order tracking details.");
    } finally {
      setLoading(false);
    }
  }, [params.publicToken]);

  useEffect(() => {
    fetchOrder();

    const { isConfigured } = getSupabasePublicEnv();
    if (!isConfigured) return;

    // Subscribe to realtime order status changes + safe polling fallback every 8s
    const supabase = createClient();
    const channel = supabase
      .channel(`order-track-${params.publicToken}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `public_token=eq.${params.publicToken}`,
        },
        () => {
          fetchOrder();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchOrder();
    }, 8000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchOrder, params.publicToken]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-forest-800" />
        <p className="text-sm font-medium text-forest-800">
          Loading live order status...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-50 px-4">
        <Card className="w-full max-w-md border-cream-200 text-center">
          <CardHeader>
            <AlertCircle className="mx-auto h-10 w-10 text-tomato-600" />
            <CardTitle className="mt-2 font-serif text-xl">
              Order Not Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-forest-700">{error}</p>
            <Button asChild variant="outline">
              <Link href="/">Return Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeStepIdx = getStepIndex(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="min-h-screen bg-cream-50 py-5 sm:py-8 px-3 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/menu"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-forest-800 hover:text-forest-950"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="truncate max-w-[200px] sm:max-w-none">Back to {order.restaurant_name} Menu</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchOrder}
            className="text-xs text-forest-700 h-8 px-2.5 sm:px-3"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Status Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <Card className="border-cream-200 shadow-xl overflow-hidden">
            <div className="bg-burgundy-950 px-4 py-4 sm:px-6 sm:py-5 text-cream-50 flex flex-wrap items-center justify-between gap-3 sm:gap-4 border-b border-burgundy-900">
              <div className="flex items-center gap-3 sm:gap-4">
                <BostonLogo variant="light" size="sm" className="h-7 sm:h-9 w-auto" />
                <div>
                  <div className="text-[10px] sm:text-xs uppercase tracking-wider text-cream-200/80">
                    {order.restaurant_name} • Table {order.table_number ?? "Dining"}
                  </div>
                  <h1 className="mt-0.5 font-serif text-xl sm:text-2xl font-bold">
                    Order #{order.order_number}
                  </h1>
                </div>
              </div>

              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="flex items-center gap-1.5 sm:gap-2"
              >
                <Badge
                  variant={isCancelled ? "destructive" : "spice"}
                  className="uppercase tracking-wider text-[10px] sm:text-xs px-2.5 sm:px-3 py-0.5 sm:py-1"
                >
                  {order.status}
                </Badge>
                <Badge
                  variant={order.payment_status === "paid" ? "veg" : "secondary"}
                  className="uppercase text-[10px] sm:text-xs"
                >
                  {order.payment_status}
                </Badge>
              </motion.div>
            </div>

            <CardContent className="p-3.5 sm:p-6">
              {isCancelled ? (
                <div className="flex items-center gap-3 rounded-xl border border-tomato-200 bg-tomato-50 p-4 text-tomato-900">
                  <XCircle className="h-6 w-6 shrink-0 text-tomato-600" />
                  <div>
                    <div className="font-bold text-sm">Order Cancelled</div>
                    <div className="text-xs mt-0.5">
                      Please speak with our restaurant staff for details or refunds.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-1 sm:gap-2">
                    {TRACKING_STEPS.map((step, idx) => {
                      const reached = idx <= activeStepIdx;
                      const current = idx === activeStepIdx;
                      return (
                        <div key={step.key} className="flex flex-col items-center text-center">
                          <div className="relative flex items-center justify-center">
                            {current && (
                              <span className="absolute -inset-1 sm:-inset-1.5 rounded-full bg-forest-600/30 animate-ping pointer-events-none" />
                            )}
                            <div
                              className={`relative flex h-7 w-7 min-[380px]:h-8 min-[380px]:w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border-2 transition-all ${
                                reached
                                  ? "border-forest-700 bg-forest-700 text-white"
                                  : "border-cream-300 bg-white text-cream-400"
                              } ${current ? "ring-2 sm:ring-4 ring-forest-200" : ""}`}
                            >
                              {idx === 0 && <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                              {idx === 1 && <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                              {idx === 2 && <ChefHat className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                              {idx === 3 && <PackageCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                              {idx === 4 && <UtensilsCrossed className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                            </div>
                          </div>
                          <span
                            className={`mt-1.5 text-[9px] min-[380px]:text-[10px] sm:text-[11px] font-bold leading-tight ${
                              reached ? "text-forest-950" : "text-forest-700/50"
                            }`}
                          >
                            {step.label}
                          </span>
                          <span className="hidden text-[10px] text-forest-700/70 sm:block">
                            {step.description}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Itemized Receipt Snapshot */}
        <Card className="border-cream-200 shadow-sm">
          <CardHeader className="border-b border-cream-200 p-4 sm:p-5 pb-3 sm:pb-3">
            <CardTitle className="font-serif text-base sm:text-lg flex items-center justify-between">
              <span>Order Items</span>
              <span className="text-xs font-sans font-normal text-forest-700 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(order.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 border-b border-cream-100 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-forest-950">
                        {item.quantity}× {item.product_name}
                      </span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {item.status}
                      </Badge>
                    </div>
                    {item.variant_name && (
                      <div className="text-xs text-forest-700">
                        Variant: {item.variant_name}
                      </div>
                    )}
                    {item.options && item.options.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.options.map((opt, idx) => (
                          <span
                            key={idx}
                            className="rounded bg-cream-100 px-1.5 py-0.5 text-[10px] text-forest-800"
                          >
                            {opt.value_name}
                            {opt.price_delta > 0
                              ? ` (+${formatCurrency(opt.price_delta, order.currency)})`
                              : ""}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.notes && (
                      <div className="mt-1 text-xs italic text-forest-700">
                        Note: &ldquo;{item.notes}&rdquo;
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-sm text-forest-950">
                    {formatCurrency(item.total_price, order.currency)}
                  </span>
                </div>
              ))}
            </div>

            {order.customer_notes && (
              <div className="rounded-lg bg-cream-50 p-3 text-xs text-forest-800">
                <strong>Order Note:</strong> {order.customer_notes}
              </div>
            )}

            <div className="space-y-1.5 border-t border-cream-200 pt-3 text-sm">
              <div className="flex justify-between text-forest-800">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal, order.currency)}</span>
              </div>
              <div className="flex justify-between text-forest-800">
                <span>Tax</span>
                <span>{formatCurrency(order.tax, order.currency)}</span>
              </div>
              {order.service_charge > 0 && (
                <div className="flex justify-between text-forest-800">
                  <span>Service Charge</span>
                  <span>{formatCurrency(order.service_charge, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-cream-200 pt-2 text-base font-bold text-forest-950">
                <span>Grand Total</span>
                <span>{formatCurrency(order.total, order.currency)}</span>
              </div>
            </div>

            {/* Payment Details & Offline Settlement */}
            {!isCancelled && (
              <div className="border-t border-cream-200 pt-4 space-y-3">
                <div className="rounded-xl border border-cream-200 bg-cream-50/70 p-3.5 sm:p-4 text-xs sm:text-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-cream-200">
                    <span className="font-semibold text-forest-950 flex items-center gap-1.5">
                      <Banknote className="h-4 w-4 text-burgundy-700 shrink-0" />
                      Payment Method
                    </span>
                    <Badge
                      variant={order.payment_status === "paid" ? "veg" : "outline"}
                      className={`capitalize text-xs font-semibold ${
                        order.payment_status !== "paid"
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : ""
                      }`}
                    >
                      {order.payment_status === "paid" ? "Paid" : "Payment Pending"}
                    </Badge>
                  </div>

                  <div className="pt-2.5 text-xs text-forest-800 space-y-1">
                    {order.payment_status === "paid" ? (
                      <p className="text-emerald-800 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        Payment of {formatCurrency(order.total, order.currency)} has been collected and verified at the restaurant.
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between font-semibold text-espresso-950">
                          <span>Pay at the restaurant</span>
                          <span>{formatCurrency(order.total, order.currency)}</span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-forest-700/80">
                          Please settle your bill directly at your table or counter when finished dining. We accept Cash, UPI, and Cards.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
