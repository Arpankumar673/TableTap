"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChefHat,
  Plus,
  KeyRound,
  Upload,
} from "lucide-react";
import {
  createStationAction,
  provisionKitchenLoginAction,
  updateRestaurantSettingsAction,
} from "@/app/actions/admin-settings";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";
import { UserRole } from "@/types/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type RestaurantRow = Database["public"]["Tables"]["restaurants"]["Row"];
type StationRow = Database["public"]["Tables"]["preparation_stations"]["Row"];

interface SettingsManagerProps {
  restaurant: RestaurantRow;
  stations: StationRow[];
  userRole: UserRole;
}

export function SettingsManager({
  restaurant,
  stations,
  userRole,
}: SettingsManagerProps) {
  const router = useRouter();

  const [name, setName] = useState(restaurant.name);
  const [slug, setSlug] = useState(restaurant.slug);
  const [description, setDescription] = useState(restaurant.description ?? "");
  const [currency, setCurrency] = useState(restaurant.currency);
  const [timezone, setTimezone] = useState(restaurant.timezone);
  const [taxRate, setTaxRate] = useState(String(restaurant.tax_rate));
  const [serviceRate, setServiceRate] = useState(
    String(restaurant.service_charge_rate)
  );
  const [phone, setPhone] = useState(restaurant.phone ?? "");
  const [email, setEmail] = useState(restaurant.email ?? "");
  const [address, setAddress] = useState(restaurant.address ?? "");
  const [logoUrl, setLogoUrl] = useState(restaurant.logo_url ?? "");
  const [coverUrl, setCoverUrl] = useState(restaurant.cover_image_url ?? "");
  const [acceptingOrders, setAcceptingOrders] = useState(
    restaurant.is_accepting_orders
  );
  const [saving, setSaving] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);

  // Station state
  const [stationName, setStationName] = useState("");
  const [stationColor, setStationColor] = useState("#1B5E3A");
  const [addingStation, setAddingStation] = useState(false);

  // Kitchen Login Provisioning (Owner only)
  const [kitchenEmail, setKitchenEmail] = useState("");
  const [kitchenPassword, setKitchenPassword] = useState("");
  const [provisioning, setProvisioning] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);

    try {
      const res = await updateRestaurantSettingsAction({
        name,
        slug,
        description,
        currency,
        timezone,
        tax_rate: Number(taxRate) || 0,
        service_charge_rate: Number(serviceRate) || 0,
        phone,
        email,
        address,
        is_accepting_orders: acceptingOrders,
        logo_url: logoUrl || null,
        cover_image_url: coverUrl || null,
      });

      if (res.error) throw new Error(res.error);
      setMsg("Restaurant settings saved successfully.");
      router.refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadBrandImage(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "logo" | "cover"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAsset(kind);
    setErr(null);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${restaurant.id}/branding/${kind}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("restaurant-assets")
        .upload(path, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage
        .from("restaurant-assets")
        .getPublicUrl(path);

      if (kind === "logo") setLogoUrl(data.publicUrl);
      else setCoverUrl(data.publicUrl);
    } catch (error) {
      setErr(
        error instanceof Error
          ? error.message
          : "Asset upload failed. You may paste a URL directly."
      );
    } finally {
      setUploadingAsset(null);
    }
  }

  async function handleAddStation(e: React.FormEvent) {
    e.preventDefault();
    if (!stationName.trim()) return;
    setAddingStation(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await createStationAction({
        name: stationName.trim(),
        color_hex: stationColor,
      });
      if (res.error) throw new Error(res.error);
      setStationName("");
      setMsg(`Added preparation station "${stationName.trim()}".`);
      router.refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to add station.");
    } finally {
      setAddingStation(false);
    }
  }

  async function handleProvisionKitchen(e: React.FormEvent) {
    e.preventDefault();
    setProvisioning(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await provisionKitchenLoginAction({
        email: kitchenEmail,
        password: kitchenPassword,
      });
      if (res.error) throw new Error(res.error);
      setMsg(`Kitchen display credentials created for ${res.email}.`);
      setKitchenEmail("");
      setKitchenPassword("");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Provisioning failed.");
    } finally {
      setProvisioning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-forest-950">
          Restaurant Configuration
        </h1>
        <p className="mt-1 text-sm text-forest-700/80">
          Manage restaurant branding, tax configuration, kitchen stations, and tablet access
        </p>
      </div>

      {msg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-900">
          <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          <span>{msg}</span>
        </div>
      )}

      {err && (
        <div className="flex items-center gap-2 rounded-xl border border-tomato-200 bg-tomato-50 p-3.5 text-sm font-medium text-tomato-900">
          <AlertCircle className="h-5 w-5 text-tomato-600" />
          <span>{err}</span>
        </div>
      )}

      {/* Restaurant Profile & Tax Config */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Profile &amp; Operations</CardTitle>
          <CardDescription>
            Displayed across your customer QR menu and customer bills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-cream-200 bg-cream-50/70 p-4">
              <div>
                <div className="font-semibold text-sm text-forest-950">
                  Accepting Dine-In Table Orders
                </div>
                <div className="text-xs text-forest-700/80">
                  Disable temporarily when kitchen is closed or at capacity
                </div>
              </div>
              <Switch
                checked={acceptingOrders}
                onCheckedChange={setAcceptingOrders}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Restaurant Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Public Menu Slug</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Editorial Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Hand-stretched sourdough pizzas, grill specialties..."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Logo URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-cream-300 bg-cream-50 px-3 text-xs font-semibold hover:bg-cream-100">
                    {uploadingAsset === "logo" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadBrandImage(e, "logo")}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Cover Banner URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-cream-300 bg-cream-50 px-3 text-xs font-semibold hover:bg-cream-100">
                    {uploadingAsset === "cover" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadBrandImage(e, "cover")}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Service Charge (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={serviceRate}
                  onChange={(e) => setServiceRate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Input
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Contact Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Street Address</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  <span>Save Restaurant Settings</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Kitchen Stations & Kitchen Display Access */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-forest-700" />
              <span>Kitchen Preparation Stations</span>
            </CardTitle>
            <CardDescription>
              Route incoming dishes automatically on the Kitchen Display
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {stations.map((st) => (
                <div
                  key={st.id}
                  className="inline-flex items-center gap-2 rounded-lg border border-cream-200 bg-cream-50 px-3 py-1.5 text-xs font-semibold text-forest-950"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: st.color_hex }}
                  />
                  <span>{st.name}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddStation} className="flex gap-2">
              <Input
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                placeholder="New station (e.g., Wood-Fire Oven)"
                required
              />
              <Input
                type="color"
                value={stationColor}
                onChange={(e) => setStationColor(e.target.value)}
                className="w-14 p-1"
              />
              <Button type="submit" disabled={addingStation}>
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {userRole === "owner" && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-forest-700" />
                <span>Kitchen Tablet Credentials</span>
              </CardTitle>
              <CardDescription>
                Create a restricted login exclusively for your kitchen display tablet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProvisionKitchen} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Kitchen Tablet Email</Label>
                  <Input
                    type="email"
                    value={kitchenEmail}
                    onChange={(e) => setKitchenEmail(e.target.value)}
                    placeholder="kitchen@yourrestaurant.com"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Password (min 8 chars)</Label>
                  <Input
                    type="password"
                    value={kitchenPassword}
                    onChange={(e) => setKitchenPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                </div>
                <Button type="submit" variant="secondary" disabled={provisioning}>
                  {provisioning ? "Provisioning..." : "Create Kitchen Login"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
