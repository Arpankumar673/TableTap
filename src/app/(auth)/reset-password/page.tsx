"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BostonLogo } from "@/components/shared/boston-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setHasValidSession(true);
        } else {
          // Listen for auth state change in case hash fragment or callback is processing
          const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY" || session) {
              setHasValidSession(true);
            }
          });
          return () => {
            authListener.subscription.unsubscribe();
          };
        }
      } catch {
        // Fallback: proceed to allow form submission to test session
        setHasValidSession(true);
      } finally {
        setSessionChecking(false);
      }
    }

    checkSession();
  }, []);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please ensure both fields are identical.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Optional sign out from recovery session so user explicitly logs in with new password
      await supabase.auth.signOut();
    } catch {
      setError("An unexpected error occurred while resetting your password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-4 py-12 text-espresso-950">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-burgundy-800 hover:text-burgundy-950 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Staff Sign In</span>
          </Link>
        </div>

        <Card className="border-cream-200/90 bg-white shadow-2xl">
          <CardHeader className="space-y-4 pb-6 pt-8 text-center">
            <div className="mx-auto flex justify-center">
              <BostonLogo variant="burgundy" size="md" className="h-12 w-auto drop-shadow-sm" />
            </div>

            <div className="space-y-1">
              <CardTitle className="font-serif text-2xl font-bold tracking-tight text-espresso-950">
                Set New Password
              </CardTitle>
              <CardDescription className="text-xs text-espresso-700/80">
                Enter your new administrator password below.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pb-8">
            {success ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-lg font-semibold text-espresso-950">
                    Password Reset Complete
                  </h3>
                  <p className="text-xs leading-relaxed text-espresso-700">
                    Your password has been securely updated. You can now sign in with your new credentials.
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/login")}
                  className="w-full bg-burgundy-800 text-cream-50 hover:bg-burgundy-900"
                >
                  Proceed to Sign In
                </Button>
              </div>
            ) : sessionChecking ? (
              <div className="flex flex-col items-center justify-center py-8 text-espresso-700">
                <Loader2 className="h-8 w-8 animate-spin text-burgundy-700" />
                <p className="mt-3 text-xs">Verifying recovery credentials...</p>
              </div>
            ) : !hasValidSession ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-burgundy-50 text-burgundy-700 border border-burgundy-200">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-serif text-base font-semibold text-espresso-950">
                    Recovery Link Expired or Invalid
                  </h3>
                  <p className="text-xs leading-relaxed text-espresso-700">
                    The password recovery link may have expired or already been used. Please request a new recovery link.
                  </p>
                </div>
                <Button asChild className="w-full bg-burgundy-800 text-cream-50 hover:bg-burgundy-900">
                  <Link href="/forgot-password">Request New Reset Link</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-burgundy-200 bg-burgundy-50 p-3.5 text-xs text-burgundy-900 shadow-sm">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-burgundy-600" />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-xs font-semibold text-espresso-900">
                    New Password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="border-cream-300 bg-cream-50/40 focus-visible:ring-burgundy-700"
                  />
                  <p className="text-[10px] text-espresso-600">Must be at least 8 characters.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-xs font-semibold text-espresso-900">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="border-cream-300 bg-cream-50/40 focus-visible:ring-burgundy-700"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-burgundy-800 text-cream-50 shadow-md transition-all hover:bg-burgundy-900"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span>Saving New Password...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-espresso-600/70">
          <span>Boston &amp; Co. American Eatery • Digital Operating System</span>
        </div>
      </div>
    </div>
  );
}
