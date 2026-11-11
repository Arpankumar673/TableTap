"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Banknote,
  Clock,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { OrderStatus, PaymentStatus } from "@/types/orders";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AdminOrderRow {
  id: string;
  restaurant_id: string;
  order_number: string;
  public_token: string;
  table_number_snapshot: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  discount: number;
  tax: number;
  service_charge: number;
  total: number;
  customer_notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  items: Array<{
    id: string;
    product_name_snapshot: string;
    variant_name_snapshot: string | null;
    quantity: number;
    unit_price_snapshot: number;
    total_price_snapshot: number;
    station_name_snapshot: string | null;
    notes: string | null;
    status: string;
    options: Array<{
      option_group_name_snapshot: string;
      option_value_name_snapshot: string;
      price_delta_snapshot: number;
    }>;
  }>;
  events: Array<{
    from_status: string | null;
    to_status: string;
    reason: string | null;
    created_at: string;
  }>;
}

interface OrdersManagerProps {
  currency: string;
  initialOrders: AdminOrderRow[];
}

export function OrdersManager({ currency, initialOrders }: OrdersManagerProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrderRow[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (dateFilter) {
        const orderDate = new Date(o.created_at).toISOString().slice(0, 10);
        if (orderDate !== dateFilter) return false;
      }
      if (q) {
        const matchOrder = o.order_number.toLowerCase().includes(q);
        const matchTable = (o.table_number_snapshot ?? "").toLowerCase().includes(q);
        if (!matchOrder && !matchTable) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter, dateFilter]);

  async function refreshOrders(restaurantId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items (
          id, product_name_snapshot, variant_name_snapshot, quantity,
          unit_price_snapshot, total_price_snapshot, station_name_snapshot, notes, status,
          order_item_options ( option_group_name_snapshot, option_value_name_snapshot, price_delta_snapshot )
        ),
        order_status_events ( from_status, to_status, reason, created_at )
      `
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(150);

    if (data) {
      const mapped = data.map((row) => ({
        ...row,
        subtotal: Number(row.subtotal),
        discount: Number(row.discount),
        tax: Number(row.tax),
        service_charge: Number(row.service_charge),
        total: Number(row.total),
        items: ((row.order_items ?? []) as unknown as Array<{
          id: string;
          product_name_snapshot: string;
          variant_name_snapshot: string | null;
          quantity: number;
          unit_price_snapshot: number;
          total_price_snapshot: number;
          station_name_snapshot: string | null;
          notes: string | null;
          status: string;
          order_item_options?: Array<{
            option_group_name_snapshot: string;
            option_value_name_snapshot: string;
            price_delta_snapshot: number;
          }>;
        }>).map((oi) => ({
          ...oi,
          unit_price_snapshot: Number(oi.unit_price_snapshot),
          total_price_snapshot: Number(oi.total_price_snapshot),
          options: (oi.order_item_options ?? []).map((opt) => ({
            ...opt,
            price_delta_snapshot: Number(opt.price_delta_snapshot),
          })),
        })),
        events: (row.order_status_events ?? []) as AdminOrderRow["events"],
      })) as AdminOrderRow[];
      setOrders(mapped);
      if (selectedOrder) {
        setSelectedOrder(mapped.find((m) => m.id === selectedOrder.id) ?? null);
      }
    }
    router.refresh();
  }

  async function handleStatusUpdate(
    order: AdminOrderRow,
    newStatus: OrderStatus,
    reason?: string
  ) {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: rpcErr } = await supabase.rpc("update_order_status_secure", {
        p_order_id: order.id,
        p_new_status: newStatus,
        p_reason: reason ?? null,
      });
      if (rpcErr) throw rpcErr;
      await refreshOrders(order.restaurant_id);
      setCancelReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order status.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkCounterPaid(order: AdminOrderRow) {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      await supabase.from("payments").insert({
        restaurant_id: order.restaurant_id,
        order_id: order.id,
        amount: order.total,
        currency,
        provider: "counter",
        status: "successful",
      });

      const { error: updErr } = await supabase
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", order.id);
      if (updErr) throw updErr;

      await refreshOrders(order.restaurant_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-forest-950">
          Order Management
        </h1>
        <p className="mt-1 text-sm text-forest-700/80">
          Search dine-in orders, audit status transitions, record counter settlements, and inspect immutable snapshots
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-700/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order # or Table #..."
              className="pl-9"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-cream-300 bg-white px-3 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="served">Served</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-auto"
          />

          {dateFilter && (
            <Button variant="ghost" size="sm" onClick={() => setDateFilter("")}>
              Clear Date
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-forest-700/80">
              No orders match your current filters.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cream-200 bg-cream-50/70 text-xs uppercase text-forest-700">
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Table</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {filtered.map((ord) => (
                  <tr key={ord.id} className="hover:bg-cream-50/50">
                    <td className="px-4 py-3.5 font-mono font-bold text-forest-950">
                      {ord.order_number}
                    </td>
                    <td className="px-4 py-3.5 font-medium">
                      Table {ord.table_number_snapshot ?? "-"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-forest-800">
                      {ord.items.reduce((s, i) => s + i.quantity, 0)} item(s)
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant={
                          ord.status === "cancelled"
                            ? "destructive"
                            : ord.status === "completed" || ord.status === "ready"
                            ? "veg"
                            : "secondary"
                        }
                        className="capitalize"
                      >
                        {ord.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant={ord.payment_status === "paid" ? "veg" : "outline"}
                        className="capitalize"
                      >
                        {ord.payment_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 font-bold">
                      {formatCurrency(ord.total, currency)}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-forest-700">
                      {new Date(ord.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setError(null);
                          setSelectedOrder(ord);
                        }}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Modal */}
      <Dialog
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        {selectedOrder && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between pr-6">
                <span>Order {selectedOrder.order_number}</span>
                <Badge className="capitalize">{selectedOrder.status}</Badge>
              </DialogTitle>
              <DialogDescription>
                Table {selectedOrder.table_number_snapshot ?? "-"} •{" "}
                {new Date(selectedOrder.created_at).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-tomato-200 bg-tomato-50 p-3 text-xs text-tomato-800">
                <AlertCircle className="h-4 w-4 text-tomato-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {selectedOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between rounded-xl border border-cream-200 bg-cream-50/40 p-3 text-sm"
                >
                  <div>
                    <div className="font-bold text-forest-950">
                      {item.quantity}× {item.product_name_snapshot}
                    </div>
                    {item.variant_name_snapshot && (
                      <div className="text-xs text-forest-700">
                        Size: {item.variant_name_snapshot}
                      </div>
                    )}
                    {item.options.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.options.map((opt, idx) => (
                          <span
                            key={idx}
                            className="rounded bg-white px-1.5 py-0.5 text-[10px] border border-cream-200"
                          >
                            {opt.option_value_name_snapshot}
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
                  <div className="text-right">
                    <div className="font-bold">
                      {formatCurrency(item.total_price_snapshot, currency)}
                    </div>
                    <div className="text-[10px] text-forest-700">
                      {item.station_name_snapshot}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Breakdown */}
            <div className="rounded-xl border border-cream-200 bg-cream-50 p-3.5 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(selectedOrder.subtotal, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(selectedOrder.tax, currency)}</span>
              </div>
              {selectedOrder.service_charge > 0 && (
                <div className="flex justify-between">
                  <span>Service Charge</span>
                  <span>
                    {formatCurrency(selectedOrder.service_charge, currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-cream-200 pt-1.5 text-sm font-bold text-forest-950">
                <span>Total ({selectedOrder.payment_status})</span>
                <span>{formatCurrency(selectedOrder.total, currency)}</span>
              </div>
            </div>

            {/* Audit History */}
            {selectedOrder.events.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase text-forest-700">
                  Audit Timeline
                </div>
                <div className="space-y-1 max-h-28 overflow-y-auto text-xs">
                  {selectedOrder.events.map((ev, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-forest-800"
                    >
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-forest-600" />
                        <strong className="capitalize">{ev.to_status}</strong>
                        {ev.reason ? `— ${ev.reason}` : ""}
                      </span>
                      <span className="text-[11px] text-forest-700/75">
                        {new Date(ev.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Actions */}
            <div className="flex flex-wrap gap-2 border-t border-cream-200 pt-3">
              {selectedOrder.payment_status !== "paid" &&
                selectedOrder.status !== "cancelled" && (
                  <Button
                    variant="default"
                    size="sm"
                    disabled={busy}
                    onClick={() => handleMarkCounterPaid(selectedOrder)}
                  >
                    <Banknote className="mr-1.5 h-4 w-4" /> Mark Counter Paid
                  </Button>
                )}

              {selectedOrder.status !== "completed" &&
                selectedOrder.status !== "cancelled" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => handleStatusUpdate(selectedOrder, "completed")}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark Completed
                  </Button>
                )}

              {selectedOrder.status !== "completed" &&
                selectedOrder.status !== "cancelled" && (
                  <div className="flex w-full gap-2 pt-2">
                    <Input
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Cancellation reason..."
                      className="h-9 text-xs"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busy || !cancelReason.trim()}
                      onClick={() =>
                        handleStatusUpdate(
                          selectedOrder,
                          "cancelled",
                          cancelReason
                        )
                      }
                    >
                      <XCircle className="mr-1.5 h-4 w-4" /> Cancel Order
                    </Button>
                  </div>
                )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
