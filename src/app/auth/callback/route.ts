import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/reset-password";

  if (code) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        // Successfully exchanged PKCE code for authenticated session
        return NextResponse.redirect(new URL(next, requestUrl.origin));
      }

      console.error("[Auth Callback] Failed to exchange code for session:", error.message);
    } catch (err) {
      console.error("[Auth Callback] Unexpected error during code exchange:", err);
    }
  }

  // If code exchange failed or no code provided, redirect to login with notification
  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set(
    "error",
    "Password recovery link is invalid or has expired. Please request a new one."
  );
  return NextResponse.redirect(loginUrl);
}
