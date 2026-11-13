"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Loader2, AlertCircle, ChefHat, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { loginSchema } from "@/lib/validation/auth";
import { BostonLogo } from "@/components/shared/boston-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlErr = params.get("error");
      if (urlErr) {
        setError(urlErr);
      }
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Please enter a valid email and password.");
      return;
    }

    const { isConfigured } = getSupabasePublicEnv();
    if (!isConfigured) {
      setError("Database connection is not configured. Please check server settings.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (signInError || !data.user) {
        setError(signInError?.message ?? "Invalid staff email or password.");
        setLoading(false);
        return;
      }

      // Check role in profiles to dispatch to Admin Dashboard or Kitchen Display
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, active")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profile || !profile.active) {
        await supabase.auth.signOut();
        setError("This account does not have active administrator or kitchen authorization.");
        setLoading(false);
        return;
      }

      if (profile.role === "kitchen") {
        router.push("/kitchen");
      } else {
        router.push("/admin");
      }
      router.refresh();
    } catch {
      setError("An unexpected authentication error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-4 py-12 text-espresso-950">
      <div className="w-full max-w-md">
        <Card className="border-cream-200/90 bg-white shadow-2xl">
          <CardHeader className="space-y-4 pb-6 pt-8 text-center">
            {/* Boston & Co. Restaurant Brand Mark */}
            <div className="mx-auto flex justify-center">
              <BostonLogo variant="burgundy" size="md" className="h-14 w-auto drop-shadow-sm" />
            </div>

            <div className="space-y-1">
              <h1 className="font-serif text-2xl font-bold tracking-tight text-espresso-950">
                Restaurant Administration
              </h1>
              <p className="text-xs font-medium text-espresso-700/80">
                Boston &amp; Co. Point of Sale &amp; Operations Console
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-burgundy-200 bg-burgundy-50 p-3.5 text-xs text-burgundy-900 shadow-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-burgundy-600" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="admin-email" className="text-xs font-semibold text-espresso-900">
                  Staff Email Address
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@bostonandco.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="border-cream-300 bg-cream-50/40 focus-visible:ring-burgundy-700"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="admin-password" className="text-xs font-semibold text-espresso-900">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-burgundy-700 hover:text-burgundy-900 hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="border-cream-300 bg-cream-50/40 focus-visible:ring-burgundy-700"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-burgundy-800 text-cream-50 shadow-md transition-all hover:bg-burgundy-900 active:scale-[0.99]"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Signing in to Console...</span>
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    <span>Sign In to Dashboard</span>
                  </>
                )}
              </Button>
            </form>

            {/* System Status & Roles Indicator */}
            <div className="rounded-xl border border-cream-200/90 bg-cream-50/60 p-3.5 text-xs">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-espresso-600/90">
                Single-Restaurant Operational Access
              </div>
              <div className="grid grid-cols-2 gap-2 text-espresso-800">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-burgundy-700 shrink-0" />
                  <span><strong>Admin:</strong> Full Control</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ChefHat className="h-3.5 w-3.5 text-gold-600 shrink-0" />
                  <span><strong>Kitchen:</strong> Live Tickets</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Discreet System Footer */}
        <div className="mt-6 text-center text-xs text-espresso-600/70">
          <span>Boston &amp; Co. American Eatery • Digital Operating System</span>
        </div>
      </div>
    </div>
  );
}
