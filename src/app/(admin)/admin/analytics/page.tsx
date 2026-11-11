import { requireRestaurantRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AnalyticsOrderData, AnalyticsView } from "@/components/admin/analytics-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Analytics & Reports | TableTap Admin",
};

export default async function AdminAnalyticsPage() {
  const ctx = await requireRestaurantRole(["owner", "admin"]);
  const supabase = await createServerSupabaseClient();
  const restaurantId = ctx.restaurant.id;

  const [{ data: ordersData }, { data: productsData }, { data: categoriesData }, { count: tableCount }] =
    await Promise.all([
      supabase
        .from("orders")
        .select(
          `
          id, order_number, table_number_snapshot, status, payment_status,
          subtotal, tax, service_charge, total, created_at,
          order_items ( product_id, product_name_snapshot, quantity, total_price_snapshot, status )
        `
        )
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("products")
        .select("id, category_id")
        .eq("restaurant_id", restaurantId),
      supabase
        .from("categories")
        .select("id, name")
        .eq("restaurant_id", restaurantId),
      supabase
        .from("restaurant_tables")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("active", true),
    ]);

  const catNameById = new Map<string, string>();
  for (const c of categoriesData ?? []) catNameById.set(c.id, c.name);

  const catNameByProduct = new Map<string, string>();
  for (const p of productsData ?? []) {
    catNameByProduct.set(
      p.id,
      catNameById.get(p.category_id) ?? "Uncategorized"
    );
  }

  const orders: AnalyticsOrderData[] = (ordersData ?? []).map((o) => ({
    id: o.id,
    order_number: o.order_number,
    table_number_snapshot: o.table_number_snapshot,
    status: o.status,
    payment_status: o.payment_status,
    subtotal: Number(o.subtotal),
    tax: Number(o.tax),
    service_charge: Number(o.service_charge),
    total: Number(o.total),
    created_at: o.created_at,
    items: ((o.order_items ?? []) as unknown as Array<{
      product_id: string | null;
      product_name_snapshot: string;
      quantity: number;
      total_price_snapshot: number;
      status: string;
    }>)
      .filter((it) => it.status !== "cancelled")
      .map((it) => ({
        product_name_snapshot: it.product_name_snapshot,
        quantity: it.quantity,
        total_price_snapshot: Number(it.total_price_snapshot),
        category_name:
          (it.product_id ? catNameByProduct.get(it.product_id) : undefined) ??
          "General",
      })),
  }));

  return (
    <AnalyticsView
      restaurantName={ctx.restaurant.name}
      currency={ctx.restaurant.currency || "INR"}
      totalTables={tableCount ?? 0}
      orders={orders}
    />
  );
}
