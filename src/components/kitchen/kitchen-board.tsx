"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChefHat,
  Clock,
  Volume2,
  VolumeX,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  LogOut,
  Wifi,
  WifiOff,
  LayoutDashboard,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { OrderItemStatus, OrderStatus } from "@/types/orders";
import { UserRole } from "@/types/roles";
import {
  getElapsedMinutes,
  getNextItemStatus,
  getNextOrderAction,
  getOrderUrgency,
} from "@/lib/orders/state-machine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BostonLogo } from "@/components/shared/boston-logo";

export interface KitchenOrderItem {
  id: string;
  product_name_snapshot: string;
  variant_name_snapshot: string | null;
  quantity: number;
  station_id: string | null;
  station_name_snapshot: string | null;
  notes: string | null;
  status: OrderItemStatus;
  options: Array<{
    option_group_name_snapshot: string;
    option_value_name_snapshot: string;
  }>;
}

export interface KitchenOrder {
  id: string;
  order_number: string;
  table_number_snapshot: string | null;
  status: OrderStatus;
  customer_notes: string | null;
  created_at: string;
  items: KitchenOrderItem[];
}

interface KitchenBoardProps {
  restaurantName: string;
  userRole: UserRole;
  stations: Array<{ id: string; name: string; color_hex: string }>;
  initialOrders: KitchenOrder[];
}

function playNotificationChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes = [659.25, 880]; // E5 -> A5 crisp kitchen bell
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      gain.gain.setValueAtTime(0.18, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.42);
    });
  } catch {
    // Ignore browser autoplay restrictions until user clicks
  }
}

export function KitchenBoard({
  restaurantName,
  userRole,
  stations,
  initialOrders,
}: KitchenBoardProps) {
  const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders);
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<
    "active" | "pending" | "preparing" | "ready" | "completed"
  >("active");
  const [muted, setMuted] = useState<boolean>(false);
  const [realtimeStatus, setRealtimeStatus] = useState<
    "connected" | "reconnecting" | "offline"
  >("connected");
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [busyOrderIds, setBusyOrderIds] = useState<Set<string>>(new Set());
  const knownOrderIdsRef = useRef<Set<string>>(
    new Set(initialOrders.map((o) => o.id))
  );

  // Live 15-second elapsed clock tick
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  const fetchLatestOrders = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id, order_number, table_number_snapshot, status, customer_notes, created_at,
        order_items (
          id, product_name_snapshot, variant_name_snapshot, quantity,
          station_id, station_name_snapshot, notes, status,
          order_item_options ( option_group_name_snapshot, option_value_name_snapshot )
        )
      `
      )
      .order("created_at", { ascending: true })
      .limit(100);

    if (error || !data) return;

    const formatted: KitchenOrder[] = data.map((row) => ({
      id: row.id,
      order_number: row.order_number,
      table_number_snapshot: row.table_number_snapshot,
      status: row.status as OrderStatus,
      customer_notes: row.customer_notes,
      created_at: row.created_at,
      items: ((row.order_items ?? []) as unknown as Array<{
        id: string;
        product_name_snapshot: string;
        variant_name_snapshot: string | null;
        quantity: number;
        station_id: string | null;
        station_name_snapshot: string | null;
        notes: string | null;
        status: OrderItemStatus;
        order_item_options?: Array<{
          option_group_name_snapshot: string;
          option_value_name_snapshot: string;
        }>;
      }>).map((oi) => ({
        id: oi.id,
        product_name_snapshot: oi.product_name_snapshot,
        variant_name_snapshot: oi.variant_name_snapshot,
        quantity: oi.quantity,
        station_id: oi.station_id,
        station_name_snapshot: oi.station_name_snapshot,
        notes: oi.notes,
        status: oi.status,
        options: oi.order_item_options ?? [],
      })),
    }));

    // Trigger notification sound if any new order appeared
    let hasNewOrder = false;
    for (const ord of formatted) {
      if (!knownOrderIdsRef.current.has(ord.id)) {
        knownOrderIdsRef.current.add(ord.id);
        if (ord.status === "new") {
          hasNewOrder = true;
        }
      }
    }
    if (hasNewOrder && !muted) {
      playNotificationChime();
    }

    setOrders(formatted);
  }, [muted]);

  // Supabase Realtime Subscription + Reconnect Recovery + Fallback Polling
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("kitchen-orders-stream")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchLatestOrders();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "order_items",
        },
        () => {
          fetchLatestOrders();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
          fetchLatestOrders();
        } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
          setRealtimeStatus("reconnecting");
        } else if (status === "CLOSED") {
          setRealtimeStatus("offline");
        }
      });

    // Controlled 15s polling resilience fallback
    const fallbackPoll = setInterval(() => {
      fetchLatestOrders();
    }, 15_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallbackPoll);
    };
  }, [fetchLatestOrders]);

  async function handleOrderStatusChange(
    orderId: string,
    newStatus: OrderStatus,
    reason?: string
  ) {
    setBusyOrderIds((prev) => new Set(prev).add(orderId));
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("update_order_status_secure", {
        p_order_id: orderId,
        p_new_status: newStatus,
        p_reason: reason ?? null,
      });
      if (!error) {
        await fetchLatestOrders();
      }
    } finally {
      setBusyOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }

  async function handleItemStatusAdvance(item: KitchenOrderItem) {
    const nextItemStatus = getNextItemStatus(item.status);
    if (!nextItemStatus) return;

    const supabase = createClient();
    const { error } = await supabase.rpc("update_order_item_status_secure", {
      p_order_item_id: item.id,
      p_new_status: nextItemStatus,
    });
    if (!error) {
      await fetchLatestOrders();
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // Metrics Calculation
  const stats = useMemo(() => {
    let pending = 0;
    let preparing = 0;
    let ready = 0;
    let completed = 0;
    let delayed = 0;

    for (const o of orders) {
      if (o.status === "new") pending++;
      if (o.status === "accepted" || o.status === "preparing") preparing++;
      if (o.status === "ready") ready++;
      if (o.status === "completed") completed++;
      if (getOrderUrgency(o.status, o.created_at, nowMs) === "delayed") {
        delayed++;
      }
    }
    return { pending, preparing, ready, completed, delayed };
  }, [orders, nowMs]);

  const visibleOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter === "active") {
        if (!["new", "accepted", "preparing", "ready"].includes(order.status)) {
          return false;
        }
      } else if (statusFilter === "pending") {
        if (order.status !== "new") return false;
      } else if (statusFilter === "preparing") {
        if (!["accepted", "preparing"].includes(order.status)) return false;
      } else if (statusFilter === "ready") {
        if (order.status !== "ready") return false;
      } else if (statusFilter === "completed") {
        if (!["completed", "cancelled"].includes(order.status)) {
          return false;
        }
      }

      if (selectedStation !== "all") {
        const hasStationItem = order.items.some(
          (i) =>
            (i.station_name_snapshot ?? "Main Kitchen").toLowerCase() ===
            selectedStation.toLowerCase()
        );
        if (!hasStationItem) return false;
      }

      return true;
    });
  }, [orders, statusFilter, selectedStation]);

  return (
    <div className="min-h-screen bg-kitchen-dark text-zinc-100">
      {/* Top Operational Bar */}
      <header className="sticky top-0 z-30 border-b border-kitchen-border bg-kitchen-dark/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-burgundy-950/80 text-burgundy-400 border border-burgundy-700/50">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <BostonLogo variant="light" size="sm" className="h-6 w-auto" />
                <span className="text-xs uppercase tracking-widest font-mono text-zinc-400">
                  | KDS
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-semibold border",
                    realtimeStatus === "connected"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  )}
                >
                  {realtimeStatus === "connected" ? (
                    <Wifi className="h-3 w-3" />
                  ) : (
                    <WifiOff className="h-3 w-3" />
                  )}
                  <span>
                    {realtimeStatus === "connected" ? "LIVE SYNC" : "RECONNECTING"}
                  </span>
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {restaurantName} • Tap order actions or individual station items to update live status
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Sound Mute Control */}
            <button
              onClick={() => {
                const nextMuted = !muted;
                setMuted(nextMuted);
                if (!nextMuted) playNotificationChime();
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-bold transition-colors",
                muted
                  ? "border-zinc-700 bg-zinc-800/80 text-zinc-400"
                  : "border-emerald-500/40 bg-emerald-950/60 text-emerald-300"
              )}
            >
              {muted ? (
                <>
                  <VolumeX className="h-4 w-4" />
                  <span>Audio Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4" />
                  <span>Sound ON</span>
                </>
              )}
            </button>

            <button
              onClick={fetchLatestOrders}
              className="inline-flex items-center gap-1.5 rounded-lg border border-kitchen-border bg-kitchen-card px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Sync</span>
            </button>

            {userRole === "admin" && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-lg border border-kitchen-border bg-kitchen-card px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Admin</span>
              </Link>
            )}

            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/50"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Status Summary & Station Filters */}
        <div className="mx-auto mt-3 flex max-w-[1600px] flex-wrap items-center justify-between gap-3 pt-3 border-t border-kitchen-border/70">
          {/* Status Queue Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { key: "active", label: "Active Queue", count: stats.pending + stats.preparing + stats.ready },
                { key: "pending", label: "New", count: stats.pending },
                { key: "preparing", label: "Preparing", count: stats.preparing },
                { key: "ready", label: "Ready", count: stats.ready },
                { key: "completed", label: "Completed", count: stats.completed },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all",
                  statusFilter === tab.key
                    ? "bg-emerald-600 text-white shadow"
                    : "bg-kitchen-card text-zinc-300 border border-kitchen-border hover:bg-zinc-800"
                )}
              >
                <span>{tab.label}</span>
                <span className="rounded-md bg-black/30 px-1.5 py-0.5 font-mono text-[11px]">
                  {tab.count}
                </span>
              </button>
            ))}

            {stats.delayed > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600/20 border border-rose-500/50 px-3 py-2 text-xs font-bold text-rose-300">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <span>{stats.delayed} Delayed (&gt;20m)</span>
              </span>
            )}
          </div>

          {/* Station Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedStation("all")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                selectedStation === "all"
                  ? "bg-white text-kitchen-dark font-bold"
                  : "bg-kitchen-card text-zinc-300 border border-kitchen-border hover:bg-zinc-800"
              )}
            >
              All Stations
            </button>
            {stations.map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStation(st.name)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  selectedStation.toLowerCase() === st.name.toLowerCase()
                    ? "bg-white text-kitchen-dark font-bold"
                    : "bg-kitchen-card text-zinc-300 border border-kitchen-border hover:bg-zinc-800"
                )}
              >
                {st.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Order Cards Grid */}
      <main className="mx-auto max-w-[1600px] p-4 sm:p-6">
        {visibleOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-kitchen-border bg-kitchen-card/50 py-24 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500/40" />
            <h2 className="mt-4 text-xl font-bold text-white">
              All Caught Up!
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              No orders in this filter right now. New customer orders appear automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleOrders.map((order) => {
              const elapsedMins = getElapsedMinutes(order.created_at, nowMs);
              const urgency = getOrderUrgency(order.status, order.created_at, nowMs);
              const nextAction = getNextOrderAction(order.status);
              const isBusy = busyOrderIds.has(order.id);

              const relevantItems =
                selectedStation === "all"
                  ? order.items
                  : order.items.filter(
                      (i) =>
                        (i.station_name_snapshot ?? "Main Kitchen").toLowerCase() ===
                        selectedStation.toLowerCase()
                    );

              return (
                <div
                  key={order.id}
                  className={cn(
                    "flex flex-col justify-between rounded-2xl border-2 bg-kitchen-card shadow-xl transition-all",
                    urgency === "delayed"
                      ? "border-rose-500 shadow-rose-950/30"
                      : urgency === "warning"
                      ? "border-amber-500/80"
                      : order.status === "new"
                      ? "border-emerald-500"
                      : "border-kitchen-border"
                  )}
                >
                  {/* Card Top Bar */}
                  <div>
                    <div
                      className={cn(
                        "flex items-center justify-between border-b px-4 py-3",
                        urgency === "delayed"
                          ? "border-rose-500/40 bg-rose-950/50"
                          : order.status === "new"
                          ? "border-emerald-500/40 bg-emerald-950/40"
                          : "border-kitchen-border bg-black/20"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-white px-2.5 py-1 font-mono text-sm font-black text-kitchen-dark">
                          T-{order.table_number_snapshot ?? "?"}
                        </span>
                        <div>
                          <div className="font-mono text-sm font-bold text-white">
                            {order.order_number}
                          </div>
                          <div className="text-[11px] uppercase font-bold tracking-wider text-emerald-400">
                            {order.status}
                          </div>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "flex items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-xs font-bold",
                          urgency === "delayed"
                            ? "bg-rose-600 text-white animate-pulse"
                            : urgency === "warning"
                            ? "bg-amber-500 text-black"
                            : "bg-zinc-800 text-zinc-200"
                        )}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>{elapsedMins}m</span>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="divide-y divide-kitchen-border/70 px-4 py-2">
                      {relevantItems.map((item) => {
                        const nextItemSt = getNextItemStatus(item.status);
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "py-3 transition-opacity",
                              item.status === "ready" && "opacity-60"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-extrabold text-white">
                                    {item.quantity}×
                                  </span>
                                  <span className="text-base font-bold text-white leading-snug">
                                    {item.product_name_snapshot}
                                  </span>
                                </div>
                                {item.variant_name_snapshot && (
                                  <div className="ml-6 mt-0.5 text-xs font-semibold text-amber-300">
                                    Size: {item.variant_name_snapshot}
                                  </div>
                                )}
                                {item.options.length > 0 && (
                                  <div className="ml-6 mt-1 flex flex-wrap gap-1">
                                    {item.options.map((o, idx) => (
                                      <span
                                        key={idx}
                                        className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200 border border-zinc-700"
                                      >
                                        + {o.option_value_name_snapshot}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {item.notes && (
                                  <div className="ml-6 mt-1.5 rounded-md bg-amber-950/60 border border-amber-500/40 px-2.5 py-1 text-xs font-semibold text-amber-200">
                                    Note: {item.notes}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <Badge variant="station">
                                  {item.station_name_snapshot ?? "Main Kitchen"}
                                </Badge>
                                {nextItemSt && (
                                  <button
                                    onClick={() => handleItemStatusAdvance(item)}
                                    className="rounded border border-emerald-500/40 bg-emerald-950/60 px-2 py-0.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-800/60"
                                  >
                                    {item.status === "pending"
                                      ? "Cook Item"
                                      : "Item Ready ✓"}
                                  </button>
                                )}
                                {item.status === "ready" && (
                                  <span className="text-[11px] font-bold text-emerald-400">
                                    Ready ✓
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {order.customer_notes && (
                      <div className="mx-4 mb-3 rounded-lg border border-amber-500/40 bg-amber-950/50 p-2.5 text-xs font-medium text-amber-200">
                        <strong>Table Note:</strong> {order.customer_notes}
                      </div>
                    )}
                  </div>

                  {/* Card Action Footer */}
                  <div className="border-t border-kitchen-border bg-black/20 p-3 flex items-center gap-2">
                    {nextAction && (
                      <Button
                        size="lg"
                        disabled={isBusy}
                        onClick={() =>
                          handleOrderStatusChange(order.id, nextAction.nextStatus)
                        }
                        className={cn(
                          "flex-1 h-12 text-sm font-extrabold",
                          order.status === "new"
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : order.status === "preparing"
                            ? "bg-amber-500 hover:bg-amber-400 text-black"
                            : "bg-forest-700 hover:bg-forest-600 text-white"
                        )}
                      >
                        <span>{nextAction.label}</span>
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}

                    {(order.status === "new" ||
                      order.status === "accepted") && (
                      <Button
                        variant="destructive"
                        size="lg"
                        disabled={isBusy}
                        onClick={() =>
                          handleOrderStatusChange(
                            order.id,
                            "cancelled",
                            "Cancelled by kitchen operator"
                          )
                        }
                        className="h-12 px-3 text-xs font-bold"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
