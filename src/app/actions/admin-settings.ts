"use server";

import { revalidatePath } from "next/cache";
import { requireRestaurantRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerEnv } from "@/lib/supabase/env";
import { restaurantSettingsSchema, stationSchema } from "@/lib/validation/restaurant";

export async function updateRestaurantSettingsAction(input: {
  name: string;
  slug: string;
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
  const ctx = await requireRestaurantRole(["owner", "admin"]);
  const parsed = restaurantSettingsSchema.safeParse({
    ...input,
    active: ctx.restaurant.active,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid settings." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("restaurants")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description ?? null,
      currency: parsed.data.currency,
      timezone: parsed.data.timezone,
      tax_rate: parsed.data.tax_rate,
      service_charge_rate: parsed.data.service_charge_rate,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
      address: parsed.data.address ?? null,
      is_accepting_orders: parsed.data.is_accepting_orders,
      logo_url: input.logo_url ?? ctx.restaurant.logo_url,
      cover_image_url: input.cover_image_url ?? ctx.restaurant.cover_image_url,
    })
    .eq("id", ctx.restaurant.id);

  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath(`/r/${parsed.data.slug}`);
  return { success: true };
}

export async function createStationAction(input: {
  name: string;
  description?: string | null;
  color_hex: string;
}) {
  const ctx = await requireRestaurantRole(["owner", "admin"]);
  const parsed = stationSchema.safeParse({ ...input, sort_order: 10, active: true });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid station details" };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("preparation_stations").insert({
    restaurant_id: ctx.restaurant.id,
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
  const ctx = await requireRestaurantRole(["owner"]);
  const serverEnv = getSupabaseServerEnv();
  if (!serverEnv.hasServiceRole) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY is required in .env.local to provision kitchen operator accounts directly.",
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
    user_metadata: {
      full_name: `${ctx.restaurant.name} Kitchen Display`,
    },
  });

  if (userErr || !userCreated.user) {
    return { error: userErr?.message ?? "Failed to create kitchen account." };
  }

  const { error: memErr } = await admin.from("restaurant_memberships").insert({
    restaurant_id: ctx.restaurant.id,
    user_id: userCreated.user.id,
    role: "kitchen",
    active: true,
  });

  if (memErr) {
    return { error: memErr.message };
  }

  return { success: true, email: input.email.trim() };
}
