import { requireRestaurantRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ManagedTable, TableQrManager } from "@/components/admin/table-qr-manager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tables & QR Codes | TableTap Admin",
};

export default async function AdminTablesPage() {
  const ctx = await requireRestaurantRole(["owner", "admin"]);
  const supabase = await createServerSupabaseClient();
  const restaurantId = ctx.restaurant.id;

  const [{ data: tableRows }, { data: qrRows }, { data: sessionRows }] =
    await Promise.all([
      supabase
        .from("restaurant_tables")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("table_number", { ascending: true }),
      supabase
        .from("table_qr_tokens")
        .select("id, table_id, token_prefix, qr_token_secret, active, created_at")
        .eq("active", true),
      supabase
        .from("table_sessions")
        .select("id, table_id, bill_requested, opened_at")
        .eq("restaurant_id", restaurantId)
        .eq("status", "open"),
    ]);

  const tables: ManagedTable[] = (tableRows ?? []).map((t) => {
    const activeQr = (qrRows ?? []).find((q) => q.table_id === t.id) ?? null;
    const openSession = (sessionRows ?? []).find((s) => s.table_id === t.id) ?? null;
    return {
      id: t.id,
      table_number: t.table_number,
      label: t.label,
      capacity: t.capacity,
      active: t.active,
      activeQr: activeQr
        ? {
            id: activeQr.id,
            token_prefix: activeQr.token_prefix,
            qr_token_secret: activeQr.qr_token_secret,
            created_at: activeQr.created_at,
          }
        : null,
      openSession: openSession
        ? {
            id: openSession.id,
            bill_requested: openSession.bill_requested,
            opened_at: openSession.opened_at,
          }
        : null,
    };
  });

  return (
    <TableQrManager
      restaurantName={ctx.restaurant.name}
      restaurantSlug={ctx.restaurant.slug}
      initialTables={tables}
    />
  );
}
