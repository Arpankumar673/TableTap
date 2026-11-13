import { requireStaffRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ManagedTable, TableQrManager } from "@/components/admin/table-qr-manager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "QR Code Management | Boston & Co. Admin",
  description: "Generate, preview, batch-export, and manage secure table QR codes.",
};

export default async function AdminQrManagementPage() {
  const ctx = await requireStaffRole(["admin"]);
  const supabase = await createServerSupabaseClient();

  const [{ data: tableRows }, { data: qrRows }, { data: sessionRows }] =
    await Promise.all([
      supabase
        .from("tables")
        .select("*")
        .order("table_number", { ascending: true }),
      supabase
        .from("table_qr_tokens")
        .select("id, table_id, token_prefix, qr_token_secret, active, created_at")
        .eq("active", true),
      supabase
        .from("table_sessions")
        .select("id, table_id, bill_requested, opened_at")
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-cream-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-burgundy-50 px-3 py-1 text-xs font-semibold text-burgundy-800 border border-burgundy-200">
            <span>Section 4 • QR Management</span>
          </div>
          <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-espresso-950">
            Table QR Management &amp; Printable Badges
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-espresso-700">
            Inspect cryptographic table tokens, print tabletop stands with Boston &amp; Co. branding, or download high-resolution ZIP archives for physical fabrication.
          </p>
        </div>
      </div>

      <TableQrManager
        restaurantName={ctx.settings.name || "Boston & Co. American Eatery"}
        initialTables={tables}
      />
    </div>
  );
}
