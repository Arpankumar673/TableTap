import { requireRestaurantRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SettingsManager } from "@/components/admin/settings-manager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings | TableTap Admin",
};

export default async function AdminSettingsPage() {
  const ctx = await requireRestaurantRole(["owner", "admin"]);
  const supabase = await createServerSupabaseClient();

  const { data: stationRows } = await supabase
    .from("preparation_stations")
    .select("*")
    .eq("restaurant_id", ctx.restaurant.id)
    .order("sort_order", { ascending: true });

  return (
    <SettingsManager
      restaurant={ctx.restaurant}
      stations={stationRows ?? []}
      userRole={ctx.role}
    />
  );
}
