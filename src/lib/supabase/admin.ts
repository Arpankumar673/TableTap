import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { getSupabaseServerEnv } from "./env";

/**
 * Creates an elevated administrative Supabase client using the Service Role Key.
 *
 * CRITICAL SECURITY NOTICE:
 * - This client BYPASSES Row Level Security (RLS).
 * - NEVER import or call this function from client-side components.
 * - Restrict use strictly to background webhooks, tenant provisioning, or trusted server actions.
 */
export function createAdminClient() {
  const env = getSupabaseServerEnv();

  if (!env.hasServiceRole || !env.serviceRoleKey) {
    throw new Error(
      "[Security / Configuration Error] SUPABASE_SERVICE_ROLE_KEY is not defined. " +
      "Privileged admin operations cannot be performed without this environment variable."
    );
  }

  return createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
