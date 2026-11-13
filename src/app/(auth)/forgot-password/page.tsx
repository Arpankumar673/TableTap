"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { BostonLogo } from "@/components/shared/boston-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please provide your registered staff email address.");
      return;
    }

    const { isConfigured } = getSupabasePublicEnv();
    if (!isConfigured) {
      setError("Supabase authentication is not configured.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const redirectUrl = `${window.location.origin}/auth/callback?next=/reset-password`;
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSent(true);
      }
    } catch {
      setError("Unable to process password recovery request. Please try again shortly.");
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
                Password Recovery
              </CardTitle>
              <CardDescription className="text-xs text-espresso-700/80">
                Enter your Boston &amp; Co. staff email to receive a secure password reset link.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pb-8">
            {sent ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-lg font-semibold text-espresso-950">
                    Recovery Link Dispatched
                  </h3>
                  <p className="text-xs leading-relaxed text-espresso-700">
                    If an account exists for <strong className="text-espresso-900">{email}</strong>, you will receive an email containing a secure link to reset your administrator password.
                  </p>
                </div>
                <Button asChild className="w-full bg-burgundy-800 text-cream-50 hover:bg-burgundy-900">
                  <Link href="/login">Return to Sign In</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-burgundy-200 bg-burgundy-50 p-3.5 text-xs text-burgundy-900 shadow-sm">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-burgundy-600" />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="recovery-email" className="text-xs font-semibold text-espresso-900">
                    Staff Email Address
                  </Label>
                  <Input
                    id="recovery-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@bostonandco.com"
                    autoComplete="email"
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
                      <span>Sending Recovery Link...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      <span>Send Password Reset Email</span>
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
