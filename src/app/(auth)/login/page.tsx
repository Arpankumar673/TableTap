"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, ArrowLeft, Lock, ChefHat, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { loginSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BostonLogo } from "@/components/shared/boston-logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Invalid login details");
      return;
    }

    const { isConfigured } = getSupabasePublicEnv();
    if (!isConfigured) {
      router.push("/setup-required");
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
        setError(signInError?.message ?? "Invalid email or password.");
        setLoading(false);
        return;
      }

      // Check role in profiles to route seamlessly to Admin or Kitchen
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, active")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profile || !profile.active) {
        await supabase.auth.signOut();
        setError("This account does not have active staff access.");
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
      setError("Unexpected authentication error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-4 py-12">
      <div className="mb-6 w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-forest-800 hover:text-forest-950"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to TableTap</span>
        </Link>
      </div>

      <Card className="w-full max-w-md border-cream-200 shadow-2xl bg-white">
        <CardHeader className="space-y-3 text-center pb-4">
          <div className="mx-auto flex justify-center py-1">
            <BostonLogo variant="burgundy" size="md" className="h-12 w-auto" />
          </div>
          <CardTitle className="font-serif text-2xl font-bold text-espresso-950">
            Staff Portal Sign In
          </CardTitle>
          <CardDescription className="text-xs text-espresso-700">
            Sign in to access Restaurant Admin Console or Kitchen Display System (KDS)
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-burgundy-200 bg-burgundy-50 p-3 text-sm text-burgundy-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-burgundy-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Staff Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@bostonandco.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-cream-50/50"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-burgundy-700 hover:text-burgundy-900 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-cream-50/50"
              />
            </div>

            <Button type="submit" className="w-full bg-burgundy-800 hover:bg-burgundy-900 text-cream-50 shadow-md" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  <span>Sign In</span>
                </>
              )}
            </Button>
          </form>

          {/* Role access guide */}
          <div className="mt-6 rounded-xl border border-cream-200 bg-cream-50/60 p-3 text-left">
            <div className="text-[10px] font-bold uppercase tracking-wider text-espresso-600 mb-1.5">
              Role-Based Automatic Dispatch
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-espresso-900">
                <ShieldCheck className="h-3.5 w-3.5 text-burgundy-700 shrink-0" />
                <span><strong>Admin:</strong> Full Control</span>
              </div>
              <div className="flex items-center gap-1.5 text-espresso-900">
                <ChefHat className="h-3.5 w-3.5 text-gold-600 shrink-0" />
                <span><strong>Kitchen:</strong> Live Tickets</span>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-cream-200 pt-4 text-center text-xs text-espresso-800/80">
            Dine-in Customer?{" "}
            <Link
              href="/menu"
              className="font-semibold text-burgundy-700 hover:text-burgundy-900 underline underline-offset-4"
            >
              Browse Public Menu
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
