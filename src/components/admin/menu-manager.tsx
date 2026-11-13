"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Plus,
  Sparkles,
  Loader2,
  Trash2,
  Edit3,
  Upload,
  CheckCircle2,
  AlertCircle,
  UtensilsCrossed,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { seedSampleCatalogAction } from "@/app/actions/admin-menu";
import { Category, DietaryType, OptionGroup, Product } from "@/types/menu";
import { DietaryBadge } from "@/components/shared/dietary-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

interface StationRow {
  id: string;
  name: string;
}

interface MenuManagerProps {
  currency: string;
  initialCategories: Category[];
  initialProducts: Product[];
  initialOptionGroups: OptionGroup[];
  stations: StationRow[];
}

function slugify(val: string): string {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function MenuManager({
  currency,
  initialCategories,
  initialProducts,
  initialOptionGroups,
  stations,
}: MenuManagerProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>(initialOptionGroups);

  const [seeding, setSeeding] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Category Modal
  const [catOpen, setCatOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catSort, setCatSort] = useState(0);
  const [savingCat, setSavingCat] = useState(false);

  // Product Modal
  const [prodOpen, setProdOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodCategoryId, setProdCategoryId] = useState(categories[0]?.id ?? "");
  const [prodStationId, setProdStationId] = useState(stations[0]?.id ?? "");
  const [prodPrice, setProdPrice] = useState("299");
  const [prodDiet, setProdDiet] = useState<DietaryType>("veg");
  const [prodImageUrl, setProdImageUrl] = useState("");
  const [prodPrepTime, setProdPrepTime] = useState("15");
  const [prodPopular, setProdPopular] = useState(false);
  const [prodFeatured, setProdFeatured] = useState(false);
  const [prodVariants, setProdVariants] = useState<Array<{ name: string; price: string }>>([]);
  const [prodGroupIds, setProdGroupIds] = useState<string[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [savingProd, setSavingProd] = useState(false);

  // Option Group Modal
  const [ogOpen, setOgOpen] = useState(false);
  const [ogName, setOgName] = useState("");
  const [ogRequired, setOgRequired] = useState(false);
  const [ogMin, setOgMin] = useState("0");
  const [ogMax, setOgMax] = useState("3");
  const [ogValues, setOgValues] = useState<Array<{ name: string; price_delta: string }>>([
    { name: "", price_delta: "0" },
  ]);
  const [savingOg, setSavingOg] = useState(false);

  async function refreshAll() {
    const supabase = createClient();
    const [{ data: cats }, { data: prods }, { data: vars }, { data: ogs }, { data: ovs }, { data: pogs }] =
      await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .order("sort_order", { ascending: true }),
        supabase
          .from("products")
          .select("*")
          .order("sort_order", { ascending: true }),
        supabase
          .from("product_variants")
          .select("*")
          .order("sort_order", { ascending: true }),
        supabase.from("option_groups").select("*"),
        supabase.from("option_values").select("*").order("sort_order", { ascending: true }),
        supabase.from("product_option_groups").select("*"),
      ]);

    const mappedOgs: OptionGroup[] = (ogs ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      required: g.required,
      min_select: g.min_select,
      max_select: g.max_select,
      active: g.active,
      options: (ovs ?? [])
        .filter((v) => v.option_group_id === g.id)
        .map((v) => ({ ...v, price_delta: Number(v.price_delta) })),
    }));

    const mappedProds: Product[] = (prods ?? []).map((p) => ({
      ...p,
      base_price: Number(p.base_price),
      variants: (vars ?? [])
        .filter((v) => v.product_id === p.id)
        .map((v) => ({ ...v, price: Number(v.price) })),
      option_groups: (pogs ?? [])
        .filter((m) => m.product_id === p.id)
        .map((m) => mappedOgs.find((g) => g.id === m.option_group_id))
        .filter((g): g is OptionGroup => Boolean(g)),
    })) as Product[];

    setCategories((cats ?? []) as Category[]);
    setProducts(mappedProds);
    setOptionGroups(mappedOgs);
    router.refresh();
  }

  async function handleSeedSample() {
    setSeeding(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await seedSampleCatalogAction();
      if (res.success) {
        setStatusMsg(
          `Boston & Co. American Eatery Menu loaded (${res.createdProducts} products added)!`
        );
        await refreshAll();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to seed sample catalog.");
    } finally {
      setSeeding(false);
    }
  }

  // Category CRUD
  function openCategoryModal(cat?: Category) {
    setEditingCat(cat ?? null);
    setCatName(cat?.name ?? "");
    setCatDesc(cat?.description ?? "");
    setCatSort(cat?.sort_order ?? categories.length + 1);
    setCatOpen(true);
  }

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    setSavingCat(true);
    setErrorMsg(null);
    const supabase = createClient();

    try {
      if (editingCat) {
        const { error } = await supabase
          .from("categories")
          .update({
            name: catName.trim(),
            description: catDesc.trim() || null,
            sort_order: catSort,
          })
          .eq("id", editingCat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert({
          name: catName.trim(),
          slug: `${slugify(catName)}-${Date.now().toString().slice(-4)}`,
          description: catDesc.trim() || null,
          sort_order: catSort,
          active: true,
        });
        if (error) throw error;
      }
      setCatOpen(false);
      await refreshAll();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save category.");
    } finally {
      setSavingCat(false);
    }
  }

  async function toggleCategoryActive(cat: Category) {
    const supabase = createClient();
    await supabase.from("categories").update({ active: !cat.active }).eq("id", cat.id);
    await refreshAll();
  }

  // Product Image Upload to Supabase Storage
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `products/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("restaurant-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) {
        throw new Error(uploadErr.message);
      }

      const { data: pubData } = supabase.storage
        .from("restaurant-assets")
        .getPublicUrl(filePath);

      setProdImageUrl(pubData.publicUrl);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Image upload failed. You can also paste an image URL directly."
      );
    } finally {
      setUploadingImg(false);
    }
  }

  // Product CRUD
  function openProductModal(prod?: Product) {
    setEditingProd(prod ?? null);
    setProdName(prod?.name ?? "");
    setProdDesc(prod?.description ?? "");
    setProdCategoryId(prod?.category_id ?? categories[0]?.id ?? "");
    setProdStationId(prod?.station_id ?? stations[0]?.id ?? "");
    setProdPrice(prod ? String(prod.base_price) : "299");
    setProdDiet(prod?.dietary_type ?? "veg");
    setProdImageUrl(prod?.image_url ?? "");
    setProdPrepTime(prod ? String(prod.prep_time_minutes) : "15");
    setProdPopular(Boolean(prod?.is_popular));
    setProdFeatured(Boolean(prod?.is_featured));
    setProdVariants(
      prod?.variants?.map((v) => ({ name: v.name, price: String(v.price) })) ?? []
    );
    setProdGroupIds(prod?.option_groups?.map((g) => g.id) ?? []);
    setProdOpen(true);
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!prodCategoryId) {
      setErrorMsg("Please create or select a category first.");
      return;
    }

    setSavingProd(true);
    setErrorMsg(null);
    const supabase = createClient();

    try {
      let productId = editingProd?.id;
      const basePrice = Math.max(0, Number(prodPrice) || 0);
      const prepTime = Math.max(1, parseInt(prodPrepTime, 10) || 15);

      if (editingProd) {
        const { error } = await supabase
          .from("products")
          .update({
            name: prodName.trim(),
            description: prodDesc.trim() || null,
            category_id: prodCategoryId,
            station_id: prodStationId || null,
            base_price: basePrice,
            dietary_type: prodDiet,
            image_url: prodImageUrl.trim() || null,
            prep_time_minutes: prepTime,
            is_popular: prodPopular,
            is_featured: prodFeatured,
          })
          .eq("id", editingProd.id);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from("products")
          .insert({
            name: prodName.trim(),
            slug: `${slugify(prodName)}-${Date.now().toString().slice(-4)}`,
            description: prodDesc.trim() || null,
            category_id: prodCategoryId,
            station_id: prodStationId || null,
            base_price: basePrice,
            dietary_type: prodDiet,
            image_url: prodImageUrl.trim() || null,
            prep_time_minutes: prepTime,
            is_popular: prodPopular,
            is_featured: prodFeatured,
            active: true,
            available: true,
          })
          .select("id")
          .single();
        if (error || !created) throw error ?? new Error("Product insert failed");
        productId = created.id;
      }

      // Sync variants cleanly
      if (productId) {
        await supabase.from("product_variants").delete().eq("product_id", productId);
        const validVariants = prodVariants.filter((v) => v.name.trim());
        if (validVariants.length > 0) {
          await supabase.from("product_variants").insert(
            validVariants.map((v, idx) => ({
              product_id: productId!,
              name: v.name.trim(),
              price: Math.max(0, Number(v.price) || basePrice),
              is_default: idx === 0,
              sort_order: idx + 1,
              active: true,
              available: true,
            }))
          );
        }

        // Sync option groups
        await supabase
          .from("product_option_groups")
          .delete()
          .eq("product_id", productId);
        if (prodGroupIds.length > 0) {
          await supabase.from("product_option_groups").insert(
            prodGroupIds.map((ogId, idx) => ({
              product_id: productId!,
              option_group_id: ogId,
              sort_order: idx + 1,
            }))
          );
        }
      }

      setProdOpen(false);
      await refreshAll();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save product.");
    } finally {
      setSavingProd(false);
    }
  }

  async function toggleProductAvailability(prod: Product) {
    const supabase = createClient();
    await supabase
      .from("products")
      .update({ available: !prod.available })
      .eq("id", prod.id);
    await refreshAll();
  }

  async function deleteProduct(prodId: string) {
    const supabase = createClient();
    await supabase.from("products").update({ active: false }).eq("id", prodId);
    await refreshAll();
  }

  // Option Group Create
  async function saveOptionGroup(e: React.FormEvent) {
    e.preventDefault();
    setSavingOg(true);
    setErrorMsg(null);
    const supabase = createClient();

    try {
      const minSel = Math.max(0, parseInt(ogMin, 10) || 0);
      const maxSel = Math.max(minSel, parseInt(ogMax, 10) || 1);

      const { data: group, error } = await supabase
        .from("option_groups")
        .insert({
          name: ogName.trim(),
          required: ogRequired,
          min_select: ogRequired ? Math.max(1, minSel) : minSel,
          max_select: maxSel,
          active: true,
        })
        .select("id")
        .single();

      if (error || !group) throw error ?? new Error("Failed to create option group");

      const validVals = ogValues.filter((v) => v.name.trim());
      if (validVals.length > 0) {
        await supabase.from("option_values").insert(
          validVals.map((v, idx) => ({
            option_group_id: group.id,
            name: v.name.trim(),
            price_delta: Math.max(0, Number(v.price_delta) || 0),
            is_default: idx === 0 && ogRequired,
            sort_order: idx + 1,
            active: true,
          }))
        );
      }

      setOgOpen(false);
      setOgName("");
      setOgValues([{ name: "", price_delta: "0" }]);
      await refreshAll();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save option group.");
    } finally {
      setSavingOg(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-forest-950">
            Menu &amp; Catalog Management
          </h1>
          <p className="mt-1 text-sm text-forest-700/80">
            Configure categories, dishes, pricing variants, add-ons, and kitchen station routing
          </p>
        </div>

        <Button
          variant="spice"
          onClick={handleSeedSample}
          disabled={seeding}
          size="sm"
        >
          {seeding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Seeding Sample Menu...</span>
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              <span>Load Boston &amp; Co. Menu</span>
            </>
          )}
        </Button>
      </div>

      {statusMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-900">
          <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-tomato-200 bg-tomato-50 p-3.5 text-sm font-medium text-tomato-900">
          <AlertCircle className="h-5 w-5 text-tomato-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Tabs defaultValue="products">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="products">
              Products ({products.filter((p) => p.active).length})
            </TabsTrigger>
            <TabsTrigger value="categories">
              Categories ({categories.length})
            </TabsTrigger>
            <TabsTrigger value="options">
              Add-Ons &amp; Options ({optionGroups.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => openCategoryModal()}>
              <Plus className="mr-1.5 h-4 w-4" /> Category
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOgOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Option Group
            </Button>
            <Button size="sm" onClick={() => openProductModal()}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Product
            </Button>
          </div>
        </div>

        {/* PRODUCTS TAB */}
        <TabsContent value="products" className="mt-5">
          {products.filter((p) => p.active).length === 0 ? (
            <Card className="py-16 text-center">
              <UtensilsCrossed className="mx-auto h-10 w-10 text-forest-700/40" />
              <h3 className="mt-3 font-serif text-xl font-bold">No menu products yet</h3>
              <p className="mt-1 text-sm text-forest-700">
                Add products manually or click &ldquo;Load Boston &amp; Co. Menu&rdquo; above.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {products
                .filter((p) => p.active)
                .map((prod) => {
                  const catName =
                    categories.find((c) => c.id === prod.category_id)?.name ?? "Uncategorized";
                  const stationName =
                    stations.find((s) => s.id === prod.station_id)?.name ?? "Main Kitchen";

                  return (
                    <Card key={prod.id} className="overflow-hidden">
                      <CardContent className="flex gap-4 p-4">
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-cream-100">
                          {prod.image_url ? (
                            <Image
                              src={prod.image_url}
                              alt={prod.name}
                              fill
                              unoptimized
                              sizes="96px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-forest-700/30">
                              <UtensilsCrossed className="h-6 w-6" />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col justify-between min-w-0">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <DietaryBadge type={prod.dietary_type} />
                                <h3 className="truncate font-serif text-base font-bold text-forest-950">
                                  {prod.name}
                                </h3>
                              </div>
                              <span className="font-bold text-sm text-forest-950 shrink-0">
                                {formatCurrency(prod.base_price, currency)}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                              <Badge variant="secondary">{catName}</Badge>
                              <Badge variant="outline">{stationName}</Badge>
                              {prod.variants && prod.variants.length > 0 && (
                                <Badge variant="outline">
                                  {prod.variants.length} sizes
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between pt-2 border-t border-cream-100">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={prod.available}
                                onCheckedChange={() => toggleProductAvailability(prod)}
                              />
                              <span className="text-xs font-medium text-forest-800">
                                {prod.available ? "In Stock" : "Sold Out"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openProductModal(prod)}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteProduct(prod.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-tomato-600" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>

        {/* CATEGORIES TAB */}
        <TabsContent value="categories" className="mt-5">
          <div className="space-y-3">
            {categories.map((cat) => (
              <Card key={cat.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-forest-700/70">
                        #{cat.sort_order}
                      </span>
                      <h3 className="font-serif text-lg font-bold text-forest-950">
                        {cat.name}
                      </h3>
                      {!cat.active && <Badge variant="secondary">Hidden</Badge>}
                    </div>
                    {cat.description && (
                      <p className="mt-0.5 text-xs text-forest-700/80">
                        {cat.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={cat.active}
                      onCheckedChange={() => toggleCategoryActive(cat)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCategoryModal(cat)}
                    >
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* OPTION GROUPS TAB */}
        <TabsContent value="options" className="mt-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {optionGroups.map((og) => (
              <Card key={og.id}>
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold text-forest-950">
                      {og.name}
                    </h3>
                    <Badge variant={og.required ? "spice" : "secondary"}>
                      {og.required
                        ? `Required (${og.min_select}–${og.max_select})`
                        : `Optional (max ${og.max_select})`}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {og.options.map((ov) => (
                      <div
                        key={ov.id}
                        className="flex justify-between rounded-lg bg-cream-50 px-3 py-1.5 text-xs"
                      >
                        <span>{ov.name}</span>
                        <span className="font-semibold">
                          +{formatCurrency(ov.price_delta, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* CATEGORY MODAL */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCat ? "Edit Category" : "Create Menu Category"}
            </DialogTitle>
            <DialogDescription>
              Organize dishes into curated editorial sections
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveCategory} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Category Name</Label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Gourmet Burgers"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Hand-stretched 48h sourdough pies..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={catSort}
                onChange={(e) => setCatSort(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={savingCat}>
              {savingCat ? "Saving..." : "Save Category"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* PRODUCT MODAL */}
      <Dialog open={prodOpen} onOpenChange={setProdOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingProd ? `Edit ${editingProd.name}` : "Add Menu Product"}
            </DialogTitle>
            <DialogDescription>
              Configure pricing, dietary indicator, station routing, and variants
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={saveProduct} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Product Name</Label>
                <Input
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Margherita Classica"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Base Price ({currency})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={prodDesc}
                onChange={(e) => setProdDesc(e.target.value)}
                placeholder="San Marzano tomatoes, fior di latte mozzarella & fresh basil..."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  value={prodCategoryId}
                  onChange={(e) => setProdCategoryId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-cream-300 bg-white px-3 text-sm"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Kitchen Station</Label>
                <select
                  value={prodStationId}
                  onChange={(e) => setProdStationId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-cream-300 bg-white px-3 text-sm"
                >
                  <option value="">Main Kitchen (Default)</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Dietary Marker</Label>
                <select
                  value={prodDiet}
                  onChange={(e) => setProdDiet(e.target.value as DietaryType)}
                  className="flex h-10 w-full rounded-md border border-cream-300 bg-white px-3 text-sm"
                >
                  <option value="veg">Vegetarian</option>
                  <option value="non-veg">Non-Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="egg">Contains Egg</option>
                </select>
              </div>
            </div>

            {/* Image Upload / URL */}
            <div className="space-y-1.5">
              <Label>Food Photo (Upload to Supabase Storage or paste URL)</Label>
              <div className="flex gap-2">
                <Input
                  value={prodImageUrl}
                  onChange={(e) => setProdImageUrl(e.target.value)}
                  placeholder="https://..."
                />
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-cream-300 bg-cream-50 px-3 text-xs font-semibold hover:bg-cream-100">
                  {uploadingImg ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Size Variants */}
            <div className="space-y-2 rounded-xl border border-cream-200 bg-cream-50/50 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase text-forest-800">
                  Sizes / Variants (e.g., Medium ₹399, Large ₹499)
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setProdVariants([...prodVariants, { name: "", price: prodPrice }])
                  }
                  className="h-7 text-xs"
                >
                  + Add Variant
                </Button>
              </div>
              {prodVariants.map((v, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={v.name}
                    onChange={(e) => {
                      const next = [...prodVariants];
                      next[idx].name = e.target.value;
                      setProdVariants(next);
                    }}
                    placeholder="Medium (10 inch)"
                  />
                  <Input
                    type="number"
                    value={v.price}
                    onChange={(e) => {
                      const next = [...prodVariants];
                      next[idx].price = e.target.value;
                      setProdVariants(next);
                    }}
                    placeholder="399"
                    className="w-28"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setProdVariants(prodVariants.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-tomato-600" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Option Groups Mapping */}
            {optionGroups.length > 0 && (
              <div className="space-y-2">
                <Label>Attach Customization Option Groups</Label>
                <div className="flex flex-wrap gap-2">
                  {optionGroups.map((og) => {
                    const selected = prodGroupIds.includes(og.id);
                    return (
                      <button
                        key={og.id}
                        type="button"
                        onClick={() =>
                          setProdGroupIds(
                            selected
                              ? prodGroupIds.filter((id) => id !== og.id)
                              : [...prodGroupIds, og.id]
                          )
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                          selected
                            ? "border-forest-800 bg-forest-800 text-white"
                            : "border-cream-300 bg-white text-forest-800"
                        }`}
                      >
                        {og.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-6 pt-1">
              <div className="flex items-center gap-2">
                <Switch checked={prodPopular} onCheckedChange={setProdPopular} />
                <Label className="text-xs">Popular Dish</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={prodFeatured} onCheckedChange={setProdFeatured} />
                <Label className="text-xs">Featured Hero</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Prep Mins:</Label>
                <Input
                  type="number"
                  value={prodPrepTime}
                  onChange={(e) => setProdPrepTime(e.target.value)}
                  className="h-8 w-20"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={savingProd}>
              {savingProd ? "Saving Product..." : "Save Product"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* OPTION GROUP MODAL */}
      <Dialog open={ogOpen} onOpenChange={setOgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Customization Option Group</DialogTitle>
            <DialogDescription>
              Add toppings, extra cheese, crust styles, or dietary exclusions
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveOptionGroup} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Group Name</Label>
              <Input
                value={ogName}
                onChange={(e) => setOgName(e.target.value)}
                placeholder="Extra Toppings"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <div className="flex items-center gap-2">
                <Switch checked={ogRequired} onCheckedChange={setOgRequired} />
                <Label className="text-xs">Required</Label>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Min Select</Label>
                <Input
                  type="number"
                  value={ogMin}
                  onChange={(e) => setOgMin(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Select</Label>
                <Input
                  type="number"
                  value={ogMax}
                  onChange={(e) => setOgMax(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">Option Values</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setOgValues([...ogValues, { name: "", price_delta: "0" }])
                  }
                  className="h-7 text-xs"
                >
                  + Add Value
                </Button>
              </div>
              {ogValues.map((val, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={val.name}
                    onChange={(e) => {
                      const next = [...ogValues];
                      next[idx].name = e.target.value;
                      setOgValues(next);
                    }}
                    placeholder="Extra Cheese"
                    required
                  />
                  <Input
                    type="number"
                    value={val.price_delta}
                    onChange={(e) => {
                      const next = [...ogValues];
                      next[idx].price_delta = e.target.value;
                      setOgValues(next);
                    }}
                    placeholder="49"
                    className="w-24"
                  />
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={savingOg}>
              {savingOg ? "Saving Option Group..." : "Create Option Group"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
