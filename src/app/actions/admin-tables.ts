"use server";

import { revalidatePath } from "next/cache";
import { requireStaffRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateSecureToken, hashToken } from "@/lib/security/tokens";
import { tableSchema } from "@/lib/validation/table";

export async function createTableWithQrAction(input: {
  table_number: string;
  label?: string | null;
  capacity: number;
}) {
  await requireStaffRole(["admin"]);
  const parsed = tableSchema.safeParse({ ...input, active: true });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid table details" };
  }

  const supabase = await createServerSupabaseClient();
  const { data: table, error: tableErr } = await supabase
    .from("tables")
    .insert({
      table_number: parsed.data.table_number.trim(),
      label: parsed.data.label?.trim() || null,
      capacity: parsed.data.capacity,
      active: true,
    })
    .select()
    .single();

  if (tableErr || !table) {
    return { error: tableErr?.message ?? "Failed to create table." };
  }

  const rawToken = generateSecureToken(24);
  const tokenHash = hashToken(rawToken);

  const { error: qrErr } = await supabase.from("table_qr_tokens").insert({
    table_id: table.id,
    token_hash: tokenHash,
    token_prefix: rawToken.slice(0, 8),
    qr_token_secret: rawToken,
    active: true,
  });

  if (qrErr) {
    return { error: `Table created, but QR generation failed: ${qrErr.message}` };
  }

  revalidatePath("/admin/tables");
  return { success: true, table, rawToken };
}

export async function regenerateTableQrAction(tableId: string) {
  await requireStaffRole(["admin"]);
  const supabase = await createServerSupabaseClient();

  const { data: table } = await supabase
    .from("tables")
    .select("id")
    .eq("id", tableId)
    .single();

  if (!table) {
    return { error: "Table not found." };
  }

  await supabase
    .from("table_qr_tokens")
    .update({ active: false, revoked_at: new Date().toISOString() })
    .eq("table_id", tableId)
    .eq("active", true);

  const rawToken = generateSecureToken(24);
  const tokenHash = hashToken(rawToken);

  const { error: insertErr } = await supabase.from("table_qr_tokens").insert({
    table_id: tableId,
    token_hash: tokenHash,
    token_prefix: rawToken.slice(0, 8),
    qr_token_secret: rawToken,
    active: true,
  });

  if (insertErr) {
    return { error: insertErr.message };
  }

  revalidatePath("/admin/tables");
  return { success: true, rawToken };
}

export async function revokeTableQrAction(tableId: string) {
  await requireStaffRole(["admin"]);
  const supabase = await createServerSupabaseClient();

  const { data: table } = await supabase
    .from("tables")
    .select("id")
    .eq("id", tableId)
    .single();

  if (!table) {
    return { error: "Table not found." };
  }

  const { error } = await supabase
    .from("table_qr_tokens")
    .update({ active: false, revoked_at: new Date().toISOString() })
    .eq("table_id", tableId)
    .eq("active", true);

  if (error) return { error: error.message };

  revalidatePath("/admin/tables");
  return { success: true };
}

export async function toggleTableActiveAction(tableId: string, active: boolean) {
  await requireStaffRole(["admin"]);
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("tables")
    .update({ active })
    .eq("id", tableId);

  if (error) return { error: error.message };

  revalidatePath("/admin/tables");
  return { success: true };
}

export async function updateTableDetailsAction(
  tableId: string,
  table_number: string,
  label: string | null,
  capacity: number
) {
  await requireStaffRole(["admin"]);
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("tables")
    .update({
      table_number: table_number.trim(),
      label: label?.trim() || null,
      capacity,
    })
    .eq("id", tableId);

  if (error) return { error: error.message };

  revalidatePath("/admin/tables");
  return { success: true };
}

export async function closeTableSessionAction(sessionId: string) {
  await requireStaffRole(["admin"]);
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("table_sessions")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) return { error: error.message };

  revalidatePath("/admin/tables");
  revalidatePath("/admin");
  return { success: true };
}
