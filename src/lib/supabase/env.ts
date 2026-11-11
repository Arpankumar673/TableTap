/**
 * Supabase Environment Variable Validator
 *
 * Ensures all required keys are validated with helpful developer errors.
 * Gracefully reports missing credentials so developers know exactly what to set in `.env.local`.
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

/**
 * Returns public Supabase configuration for browser clients.
 */
export function getSupabasePublicEnv(): SupabasePublicEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const isConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project-id") &&
    !supabaseAnonKey.includes("your-supabase-anon-key")
  );

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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  const hasServiceRole = Boolean(
    serviceRoleKey && !serviceRoleKey.includes("your-supabase-service-role-key")
  );

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
    throw new Error(
      "Supabase environment variables are missing or unconfigured. " +
      "Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in `.env.local`. " +
      "Refer to ENVIRONMENT_SETUP.md for step-by-step instructions."
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}
