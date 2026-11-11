"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

function slugify(val: string): string {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      // Check if user already has a restaurant membership
      const { data: memberships } = await supabase
        .from("restaurant_memberships")
        .select("role")
        .eq("user_id", user.id)
        .eq("active", true)
        .limit(1);

      if (memberships && memberships.length > 0) {
        router.replace(memberships[0].role === "kitchen" ? "/kitchen" : "/admin");
        return;
      }

      const pendingName = user.user_metadata?.pending_restaurant_name as string | undefined;
      const pendingSlug = user.user_metadata?.pending_restaurant_slug as string | undefined;
      if (pendingName) {
        setName(pendingName);
        setSlug(pendingSlug ?? slugify(pendingName));
      }
      setChecking(false);
    }
    init();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !slug.trim()) {
      setError("Restaurant name and URL identifier are required.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("onboard_restaurant", {
        p_name: name.trim(),
        p_slug: slug.trim().toLowerCase(),
        p_currency: currency,
        p_timezone: "Asia/Kolkata",
        p_phone: phone.trim() || null,
        p_address: address.trim() || null,
      });

      if (rpcError) {
        setError(rpcError.message);
        setLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Unable to create restaurant workspace.");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-50">
        <Loader2 className="h-8 w-8 animate-spin text-forest-800" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 px-4 py-12">
      <Card className="w-full max-w-lg border-cream-200 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-forest-800 text-cream-50">
            <Store className="h-6 w-6" />
          </div>
          <CardTitle className="font-serif text-2xl text-forest-950">
            Set Up Your Restaurant Workspace
          </CardTitle>
          <CardDescription>
            Configure your isolated multi-tenant restaurant profile
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-tomato-200 bg-tomato-50 p-3 text-sm text-tomato-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="The Rustic Truffle"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Menu URL Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="the-rustic-truffle"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  placeholder="INR"
                  maxLength={5}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98200 12345"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="14 Culinary Lane, Bandra West, Mumbai"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Creating Restaurant...</span>
                </>
              ) : (
                <span>Create Workspace &amp; Enter Admin Dashboard</span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
