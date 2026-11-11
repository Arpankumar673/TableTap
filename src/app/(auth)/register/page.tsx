"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  QrCode,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Store,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { restaurantRegisterSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

export default function RegisterPage() {
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(
    null
  );

  function handleNameChange(value: string) {
    setRestaurantName(value);
    if (!slugEdited) {
      setSlug(toSlug(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConfirmationMessage(null);

    const parsed = restaurantRegisterSchema.safeParse({
      restaurantName,
      slug,
      ownerEmail,
      password,
      phone: phone || undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Please check your registration details");
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

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.ownerEmail,
        password: parsed.data.password,
        options: {
          data: {
            full_name: `${parsed.data.restaurantName} Owner`,
            pending_restaurant_name: parsed.data.restaurantName,
            pending_restaurant_slug: parsed.data.slug,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (signUpData.session) {
        // Session active immediately -> create restaurant tenant atomically via RPC
        const { error: onboardErr } = await supabase.rpc("onboard_restaurant", {
          p_name: parsed.data.restaurantName,
          p_slug: parsed.data.slug,
          p_currency: "INR",
          p_timezone: "Asia/Kolkata",
          p_phone: parsed.data.phone ?? null,
        });

        if (onboardErr) {
          setError(onboardErr.message);
          setLoading(false);
          return;
        }

        router.push("/admin");
        router.refresh();
        return;
      }

      setConfirmationMessage(
        "Account created! Please check your email inbox to confirm your email address, then log in to finish setting up your restaurant."
      );
      setLoading(false);
    } catch {
      setError("Registration failed unexpectedly. Please try again.");
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
            Create Your Restaurant
          </CardTitle>
          <CardDescription>
            Launch QR-based dine-in ordering and live kitchen routing in minutes
          </CardDescription>
        </CardHeader>

        <CardContent>
          {confirmationMessage ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm leading-relaxed text-forest-900">
                {confirmationMessage}
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Go to Sign In</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-tomato-200 bg-tomato-50 p-3 text-sm text-tomato-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-tomato-600" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="restaurantName">Restaurant Name</Label>
                <Input
                  id="restaurantName"
                  placeholder="Pizza House"
                  value={restaurantName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Menu URL Identifier</Label>
                <div className="flex items-center rounded-md border border-cream-300 bg-cream-50/70 px-3 text-xs text-forest-700">
                  <span className="shrink-0 pr-1 select-none">/r/</span>
                  <input
                    id="slug"
                    value={slug}
                    onChange={(e) => {
                      setSlugEdited(true);
                      setSlug(toSlug(e.target.value));
                    }}
                    placeholder="pizza-house"
                    required
                    className="h-10 w-full bg-transparent text-sm text-forest-950 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Owner Email</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  placeholder="owner@pizzahouse.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98200 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password (min 8 chars)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Creating Workspace...</span>
                  </>
                ) : (
                  <>
                    <Store className="mr-2 h-4 w-4" />
                    <span>Launch Restaurant Workspace</span>
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-cream-200 pt-5 text-center text-sm text-forest-800/80">
            Already have a TableTap workspace?{" "}
            <Link
              href="/login"
              className="font-semibold text-forest-800 hover:text-forest-950 underline underline-offset-4"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
