import { requireStaffRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { KitchenBoard, KitchenOrder } from "@/components/kitchen/kitchen-board";
import { OrderItemStatus, OrderStatus } from "@/types/orders";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kitchen Display System | TableTap",
};

export default async function KitchenPage() {
  const ctx = await requireStaffRole(["admin", "kitchen"]);
  const supabase = await createServerSupabaseClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [{ data: stationRows }, { data: orderRows }] = await Promise.all([
    supabase
      .from("preparation_stations")
      .select("id, name, color_hex")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
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
      .or(`status.in.(new,accepted,preparing,ready),created_at.gte.${todayStart.toISOString()}`)
      .order("created_at", { ascending: true })
      .limit(60),
  ]);

  const initialOrders: KitchenOrder[] = (orderRows ?? []).map((row) => ({
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

  return (
    <KitchenBoard
      restaurantName={ctx.settings.name}
      userRole={ctx.role}
      stations={stationRows ?? []}
      initialOrders={initialOrders}
    />
  );
}
