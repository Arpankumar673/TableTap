import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { getSupabasePublicEnv } from "./env";

/**
 * Creates or retrieves a singleton Supabase client for browser environments.
 */
export function createClient(): SupabaseClient<Database> {
  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabasePublicEnv();

  if (!isConfigured) {
    console.warn(
      "[TableTap Supabase] Client initialized without live Supabase credentials. " +
      "Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in `.env.local` to enable live database connectivity."
    );
  }

  return createBrowserClient<Database>(
    supabaseUrl || "https://placeholder-project.supabase.co",
    supabaseAnonKey || "placeholder-anon-key"
  ) as unknown as SupabaseClient<Database>;
}
