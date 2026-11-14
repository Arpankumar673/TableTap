import { requireStaffRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminOrderRow, OrdersManager } from "@/components/admin/orders-manager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Orders | TableTap Admin",
};

export default async function AdminOrdersPage() {
  const ctx = await requireStaffRole(["admin"]);
  const supabase = await createServerSupabaseClient();

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
    .order("created_at", { ascending: false })
    .limit(60);

  const orders: AdminOrderRow[] = (data ?? []).map((row) => ({
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

  return (
    <OrdersManager
      currency={ctx.settings.currency || "INR"}
      initialOrders={orders}
    />
  );
}
