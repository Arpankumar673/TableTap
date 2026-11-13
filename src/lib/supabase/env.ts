/**
 * Supabase Environment Variable Configuration
 *
 * Provides primary access to Supabase credentials with production project fallbacks.
 * Ensures deployed instances on Vercel remain functional while allowing custom
 * overrides via process.env.NEXT_PUBLIC_SUPABASE_URL and process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */

export interface SupabasePublicEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConfigured: boolean;
}

export interface SupabaseServerEnv extends SupabasePublicEnv {
  serviceRoleKey?: string;
  hasServiceRole: boolean;
}

// Verified Production Project Public Credentials for Boston & Co. (TableTap)
const PRODUCTION_SUPABASE_URL = "https://kfimhoxkyfhfgtzrlsen.supabase.co";
const PRODUCTION_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmaW1ob3hreWZoZmd0enJsc2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDU2MzUsImV4cCI6MjA5MDEyMTYzNX0.KqbQp641uyotKRoR4wvo_h5NxTTUT2prMANzoKduND4";

/**
 * Returns public Supabase configuration for browser clients.
 */
export function getSupabasePublicEnv(): SupabasePublicEnv {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Use environment variables if set and valid, otherwise fallback to verified production project
  const supabaseUrl =
    envUrl && !envUrl.includes("your-project-id")
      ? envUrl.trim()
      : PRODUCTION_SUPABASE_URL;

  const supabaseAnonKey =
    envAnonKey && !envAnonKey.includes("your-supabase-anon-key")
      ? envAnonKey.trim()
      : PRODUCTION_SUPABASE_ANON_KEY;

  const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

  return {
    supabaseUrl,
    supabaseAnonKey,
    isConfigured,
  };
}

/**
 * Returns server-only Supabase configuration.
 * Never invoke this on client-side code.
 */
export function getSupabaseServerEnv(): SupabaseServerEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "[Security Violation] getSupabaseServerEnv() cannot be accessed from browser code."
    );
  }

  const publicEnv = getSupabasePublicEnv();
  const envServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const serviceRoleKey =
    envServiceKey && !envServiceKey.includes("your-supabase-service-role-key")
      ? envServiceKey.trim()
      : undefined;

  const hasServiceRole = Boolean(serviceRoleKey);

  return {
    ...publicEnv,
    serviceRoleKey: hasServiceRole ? serviceRoleKey : undefined,
    hasServiceRole,
  };
}

/**
 * Validates that public credentials exist; throws descriptive error if not.
 */
export function assertSupabaseConfigured(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
} {
  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabasePublicEnv();

  if (!isConfigured) {
    const errorMsg =
      "[Configuration Error] Supabase credentials could not be resolved. " +
      "Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return { supabaseUrl, supabaseAnonKey };
}
