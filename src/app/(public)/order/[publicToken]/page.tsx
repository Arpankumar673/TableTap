"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChefHat,
  Clock,
  CreditCard,
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
  restaurant_slug: string;
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
  { key: "pending", label: "Order Received", description: "Sent to restaurant" },
  { key: "accepted", label: "Accepted", description: "Kitchen confirmed" },
  { key: "preparing", label: "Preparing", description: "Chef is cooking" },
  { key: "ready", label: "Ready", description: "Plated & hot" },
  { key: "served", label: "Served", description: "At your table" },
];

function getStepIndex(status: OrderStatus): number {
  if (status === "completed") return 4;
  return TRACKING_STEPS.findIndex((s) => s.key === status);
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

export default function OrderTrackingPage({
  params,
}: {
  params: { publicToken: string };
}) {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

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

  async function handleRazorpayPayment() {
    if (!order) return;
    setPaying(true);
    setPaymentMessage(null);

    try {
      const res = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken: order.public_token }),
      });

      const data = (await res.json()) as {
        razorpayOrderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
        error?: string;
      };

      if (!res.ok || !data.razorpayOrderId || !data.keyId) {
        setPaymentMessage(
          data.error ?? "Online payment unavailable. You can settle at the counter."
        );
        setPaying(false);
        return;
      }

      // Dynamically load Razorpay Checkout JS SDK
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
          document.body.appendChild(script);
        });
      }

      if (!window.Razorpay) {
        throw new Error("Razorpay checkout unavailable.");
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: order.restaurant_name,
        description: `Order ${order.order_number} • Table ${order.table_number ?? ""}`,
        order_id: data.razorpayOrderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              publicToken: order.public_token,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          if (verifyRes.ok) {
            setPaymentMessage("Payment verified and confirmed!");
            fetchOrder();
          } else {
            setPaymentMessage("Payment verification pending.");
          }
          setPaying(false);
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
        theme: { color: "#1B5E3A" },
      });

      rzp.open();
    } catch (err) {
      setPaymentMessage(
        err instanceof Error ? err.message : "Unable to initiate online payment."
      );
      setPaying(false);
    }
  }

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
    <div className="min-h-screen bg-cream-50 py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <Link
            href={`/r/${order.restaurant_slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-800 hover:text-forest-950"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to {order.restaurant_name} Menu</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchOrder}
            className="text-xs text-forest-700"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Status Hero Card */}
        <Card className="border-cream-200 shadow-lg overflow-hidden">
          <div className="bg-forest-900 px-6 py-5 text-cream-50 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-cream-200/80">
                {order.restaurant_name} • Table {order.table_number ?? "Dining"}
              </div>
              <h1 className="mt-1 font-serif text-2xl font-bold">
                Order #{order.order_number}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant={isCancelled ? "destructive" : "spice"}
                className="uppercase tracking-wider text-xs px-3 py-1"
              >
                {order.status}
              </Badge>
              <Badge
                variant={order.payment_status === "paid" ? "veg" : "secondary"}
                className="uppercase text-xs"
              >
                {order.payment_status}
              </Badge>
            </div>
          </div>

          <CardContent className="p-6">
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
                <div className="grid grid-cols-5 gap-2">
                  {TRACKING_STEPS.map((step, idx) => {
                    const reached = idx <= activeStepIdx;
                    const current = idx === activeStepIdx;
                    return (
                      <div key={step.key} className="flex flex-col items-center text-center">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                            reached
                              ? "border-forest-700 bg-forest-700 text-white"
                              : "border-cream-300 bg-white text-cream-400"
                          } ${current ? "ring-4 ring-forest-100" : ""}`}
                        >
                          {idx === 0 && <Receipt className="h-4 w-4" />}
                          {idx === 1 && <CheckCircle2 className="h-4 w-4" />}
                          {idx === 2 && <ChefHat className="h-4 w-4" />}
                          {idx === 3 && <PackageCheck className="h-4 w-4" />}
                          {idx === 4 && <UtensilsCrossed className="h-4 w-4" />}
                        </div>
                        <span
                          className={`mt-2 text-[11px] font-bold leading-tight ${
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

        {/* Itemized Receipt Snapshot */}
        <Card className="border-cream-200 shadow-sm">
          <CardHeader className="border-b border-cream-200 pb-3">
            <CardTitle className="font-serif text-lg flex items-center justify-between">
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
          <CardContent className="p-5 space-y-4">
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

            {/* Payment Trigger */}
            {!isCancelled && order.payment_status !== "paid" && (
              <div className="border-t border-cream-200 pt-4 space-y-2">
                {paymentMessage && (
                  <div className="rounded-lg bg-cream-100 p-3 text-xs text-forest-900">
                    {paymentMessage}
                  </div>
                )}
                <Button
                  className="w-full font-semibold"
                  onClick={handleRazorpayPayment}
                  disabled={paying}
                >
                  {paying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span>Preparing Checkout...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>
                        Pay Now Online ({formatCurrency(order.total, order.currency)})
                      </span>
                    </>
                  )}
                </Button>
                <p className="text-center text-[11px] text-forest-700/75">
                  Or settle via cash/card directly at the restaurant counter when finished.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
