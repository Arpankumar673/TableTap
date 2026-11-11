import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { UserRole } from "@/types/roles";
import { Database } from "@/types/database";

type RestaurantRow = Database["public"]["Tables"]["restaurants"]["Row"];

export interface AuthenticatedRestaurantContext {
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
  role: UserRole;
  restaurant: RestaurantRow;
  allRestaurants: Array<{
    restaurant: RestaurantRow;
    role: UserRole;
  }>;
}

/**
 * Fetches the authenticated user's active restaurant workspace and role.
 * Returns null if unauthenticated, unconfigured, or user has no memberships.
 */
export async function getOptionalMemberContext(
  preferredRestaurantId?: string
): Promise<{
  isConfigured: boolean;
  user: { id: string; email: string; fullName: string | null } | null;
  context: AuthenticatedRestaurantContext | null;
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

  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const fullName =
    (profileData as { full_name?: string | null } | null)?.full_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    null;

  const userSummary = {
    id: user.id,
    email: user.email ?? "",
    fullName,
  };

  const { data: memberships, error: memberError } = await supabase
    .from("restaurant_memberships")
    .select("role, active, restaurants(*)")
    .eq("user_id", user.id)
    .eq("active", true);

  if (memberError || !memberships || memberships.length === 0) {
    return { isConfigured: true, user: userSummary, context: null };
  }

  const validMemberships = memberships
    .map((m) => {
      const rest = m.restaurants as unknown as RestaurantRow | null;
      if (!rest) return null;
      return {
        role: m.role as UserRole,
        restaurant: rest,
      };
    })
    .filter((item): item is { role: UserRole; restaurant: RestaurantRow } => item !== null);

  if (validMemberships.length === 0) {
    return { isConfigured: true, user: userSummary, context: null };
  }

  const selected =
    (preferredRestaurantId
      ? validMemberships.find((m) => m.restaurant.id === preferredRestaurantId)
      : undefined) ?? validMemberships[0];

  return {
    isConfigured: true,
    user: userSummary,
    context: {
      user: userSummary,
      role: selected.role,
      restaurant: selected.restaurant,
      allRestaurants: validMemberships,
    },
  };
}

/**
 * Enforces authentication and role-based access for Server Components & Pages.
 */
export async function requireRestaurantRole(
  allowedRoles: UserRole[]
): Promise<AuthenticatedRestaurantContext> {
  const { isConfigured, user, context } = await getOptionalMemberContext();

  if (!isConfigured) {
    redirect("/setup-required");
  }

  if (!user) {
    redirect("/login");
  }

  if (!context) {
    redirect("/onboarding");
  }

  if (!allowedRoles.includes(context.role)) {
    if (context.role === "kitchen") {
      redirect("/kitchen");
    }
    redirect("/login?error=unauthorized");
  }

  return context;
}
