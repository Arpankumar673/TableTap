import { requireStaffRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SettingsManager } from "@/components/admin/settings-manager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings | TableTap Admin",
};

export default async function AdminSettingsPage() {
  const ctx = await requireStaffRole(["admin"]);
  const supabase = await createServerSupabaseClient();

  const { data: stationRows } = await supabase
    .from("preparation_stations")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <SettingsManager
      settings={ctx.settings}
      stations={stationRows ?? []}
      userRole={ctx.role}
    />
  );
}
