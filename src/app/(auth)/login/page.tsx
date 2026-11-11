"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrCode, Loader2, AlertCircle, ArrowLeft, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { loginSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

      // Check role membership to route seamlessly to Admin or Kitchen
      const { data: memberships } = await supabase
        .from("restaurant_memberships")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("active", true)
        .limit(1);

      if (!memberships || memberships.length === 0) {
        router.push("/onboarding");
      } else if (memberships[0].role === "kitchen") {
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

      <Card className="w-full max-w-md border-cream-200 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-forest-800 text-cream-50 shadow-md">
            <QrCode className="h-6 w-6" />
          </div>
          <CardTitle className="font-serif text-2xl font-bold text-forest-950">
            Sign in to TableTap
          </CardTitle>
          <CardDescription>
            Access your Restaurant Admin Dashboard or Kitchen Display
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-tomato-200 bg-tomato-50 p-3 text-sm text-tomato-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-tomato-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="owner@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-forest-700 hover:text-forest-950 hover:underline"
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
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
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

          <div className="mt-6 border-t border-cream-200 pt-5 text-center text-sm text-forest-800/80">
            New restaurant partner?{" "}
            <Link
              href="/register"
              className="font-semibold text-forest-800 hover:text-forest-950 underline underline-offset-4"
            >
              Register your restaurant
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
