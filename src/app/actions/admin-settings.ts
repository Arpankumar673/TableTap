"use server";

import { revalidatePath } from "next/cache";
import { requireStaffRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerEnv } from "@/lib/supabase/env";
import { restaurantSettingsSchema, stationSchema } from "@/lib/validation/restaurant";

export async function updateRestaurantSettingsAction(input: {
  name: string;
  description?: string | null;
  currency: string;
  timezone: string;
  tax_rate: number;
  service_charge_rate: number;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  is_accepting_orders: boolean;
  logo_url?: string | null;
  cover_image_url?: string | null;
}) {
  const ctx = await requireStaffRole(["admin"]);
  const parsed = restaurantSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid settings." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("restaurant_settings")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      currency: parsed.data.currency,
      timezone: parsed.data.timezone,
      tax_rate: parsed.data.tax_rate,
      service_charge_rate: parsed.data.service_charge_rate,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
      address: parsed.data.address ?? null,
      is_accepting_orders: parsed.data.is_accepting_orders,
      logo_url: input.logo_url ?? ctx.settings.logo_url,
      cover_image_url: input.cover_image_url ?? ctx.settings.cover_image_url,
    })
    .eq("id", ctx.settings.id);

  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/menu");
  return { success: true };
}

export async function createStationAction(input: {
  name: string;
  description?: string | null;
  color_hex: string;
}) {
  await requireStaffRole(["admin"]);
  const parsed = stationSchema.safeParse({ ...input, sort_order: 10, active: true });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid station details" };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("preparation_stations").insert({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    color_hex: parsed.data.color_hex,
    sort_order: parsed.data.sort_order,
    active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  revalidatePath("/admin/menu");
  revalidatePath("/kitchen");
  return { success: true };
}

export async function provisionKitchenLoginAction(input: {
  email: string;
  password: string;
}) {
  const ctx = await requireStaffRole(["admin"]);
  const serverEnv = getSupabaseServerEnv();
  if (!serverEnv.hasServiceRole) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY is required in .env.local to provision kitchen display accounts directly.",
    };
  }

  if (!input.email || input.password.length < 8) {
    return { error: "Provide a valid email and password (at least 8 characters)." };
  }

  const admin = createAdminClient();
  const { data: userCreated, error: userErr } = await admin.auth.admin.createUser({
    email: input.email.trim(),
    password: input.password,
    email_confirm: true,
    app_metadata: {
      role: "kitchen",
    },
    user_metadata: {
      full_name: `${ctx.settings.name} Kitchen Display`,
    },
  });

  if (userErr || !userCreated.user) {
    return { error: userErr?.message ?? "Failed to create kitchen account." };
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .upsert({
      id: userCreated.user.id,
      email: input.email.trim(),
      full_name: `${ctx.settings.name} Kitchen Display`,
      role: "kitchen",
      active: true,
    });

  if (profileErr) {
    return { error: profileErr.message };
  }

  return { success: true, email: input.email.trim() };
}
