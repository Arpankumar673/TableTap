"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { requireStaffRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicEnv, getSupabaseServerEnv } from "@/lib/supabase/env";
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

export async function changeAdminPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const ctx = await requireStaffRole(["admin"]);
  const email = ctx.user.email;

  if (!email) {
    return { error: "Unable to identify administrator email from active session." };
  }

  const currentPassword = input.currentPassword?.trim();
  const newPassword = input.newPassword?.trim();
  const confirmPassword = input.confirmPassword?.trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Current password, new password, and confirmation are required." };
  }

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters long." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation password do not match." };
  }

  if (currentPassword === newPassword) {
    return { error: "New password must be different from your current password." };
  }

  // 1. Verify current password by re-authenticating with Supabase
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();
  const verifyClient = createSupabaseJsClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error: verifyError } = await verifyClient.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (verifyError) {
    return { error: "Current password is incorrect. Please verify and try again." };
  }

  // 2. Update password in Supabase Auth securely without storing plaintext
  const serverEnv = getSupabaseServerEnv();
  if (serverEnv.hasServiceRole && serverEnv.serviceRoleKey) {
    const admin = createAdminClient();
    const { error: updateError } = await admin.auth.admin.updateUserById(ctx.user.id, {
      password: newPassword,
    });
    if (updateError) {
      return { error: updateError.message };
    }
  } else {
    const supabase = await createServerSupabaseClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) {
      return { error: updateError.message };
    }
  }

  revalidatePath("/admin/settings");
  return { success: true };
}
