import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { UserRole } from "@/types/roles";
import { Database } from "@/types/database";

type RestaurantSettingsRow = Database["public"]["Tables"]["restaurant_settings"]["Row"];

export interface AuthenticatedStaffContext {
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
  role: UserRole;
  settings: RestaurantSettingsRow;
}

const FALLBACK_SETTINGS: RestaurantSettingsRow = {
  id: "singleton",
  singleton_key: true,
  name: "TableTap Kitchen & Bistro",
  description: "Artisan dine-in ordering powered by TableTap",
  logo_url: null,
  cover_image_url: null,
  currency: "INR",
  timezone: "Asia/Kolkata",
  tax_rate: 5,
  service_charge_rate: 0,
  phone: null,
  email: null,
  address: null,
  opening_hours: {},
  is_accepting_orders: true,
  settings: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Fetches the authenticated staff profile (admin or kitchen) and singleton restaurant settings.
 */
export async function getOptionalStaffContext(): Promise<{
  isConfigured: boolean;
  user: { id: string; email: string; fullName: string | null } | null;
  context: AuthenticatedStaffContext | null;
}> {
  const { isConfigured } = getSupabasePublicEnv();
  if (!isConfigured) {
    return { isConfigured: false, user: null, context: null };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { isConfigured: true, user: null, context: null };
  }

  const [{ data: profileData }, { data: settingsData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, role, active")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("restaurant_settings").select("*").limit(1).maybeSingle(),
  ]);

  const userSummary = {
    id: user.id,
    email: user.email ?? "",
    fullName:
      profileData?.full_name ??
      (user.user_metadata?.full_name as string | undefined) ??
      null,
  };

  if (!profileData || !profileData.active) {
    return { isConfigured: true, user: userSummary, context: null };
  }

  const role = profileData.role as UserRole;
  if (role !== "admin" && role !== "kitchen") {
    return { isConfigured: true, user: userSummary, context: null };
  }

  return {
    isConfigured: true,
    user: userSummary,
    context: {
      user: userSummary,
      role,
      settings: (settingsData as RestaurantSettingsRow | null) ?? FALLBACK_SETTINGS,
    },
  };
}

/**
 * Enforces authentication and role-based authorization ('admin' or 'kitchen')
 * for Server Components, Layouts, and Server Actions.
 */
export async function requireStaffRole(
  allowedRoles: UserRole[]
): Promise<AuthenticatedStaffContext> {
  const { isConfigured, user, context } = await getOptionalStaffContext();

  if (!isConfigured) {
    redirect("/setup-required");
  }

  if (!user) {
    redirect("/login");
  }

  if (!context) {
    redirect("/login?error=unauthorized");
  }

  if (!allowedRoles.includes(context.role)) {
    if (context.role === "kitchen") {
      redirect("/kitchen");
    }
    redirect("/login?error=unauthorized");
  }

  return context;
}
