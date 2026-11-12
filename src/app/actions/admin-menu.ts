"use server";

import { revalidatePath } from "next/cache";
import { requireStaffRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  SAMPLE_CATEGORIES,
  SAMPLE_PRODUCTS,
  SAMPLE_STATIONS,
} from "@/lib/demo/catalog";
import { generateSecureToken, hashToken } from "@/lib/security/tokens";

export async function seedSampleCatalogAction() {
  await requireStaffRole(["admin"]);
  const supabase = await createServerSupabaseClient();

  // 1. Ensure sample preparation stations exist
  const { data: existingStations } = await supabase
    .from("preparation_stations")
    .select("id, name");

  const stationMap = new Map<string, string>();
  for (const st of existingStations ?? []) {
    stationMap.set(st.name, st.id);
  }

  for (let i = 0; i < SAMPLE_STATIONS.length; i++) {
    const st = SAMPLE_STATIONS[i];
    if (!stationMap.has(st.name)) {
      const { data: created } = await supabase
        .from("preparation_stations")
        .insert({
          name: st.name,
          description: st.description,
          color_hex: st.color_hex,
          sort_order: i + 1,
          active: true,
        })
        .select("id, name")
        .single();
      if (created) stationMap.set(created.name, created.id);
    }
  }

  // 2. Seed 14 representative categories
  const { data: existingCats } = await supabase
    .from("categories")
    .select("id, slug");

  const categoryMap = new Map<string, string>();
  for (const c of existingCats ?? []) {
    categoryMap.set(c.slug, c.id);
  }

  for (const cat of SAMPLE_CATEGORIES) {
    if (!categoryMap.has(cat.slug)) {
      const { data: created } = await supabase
        .from("categories")
        .insert({
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          sort_order: cat.sort_order,
          active: true,
        })
        .select("id, slug")
        .single();
      if (created) categoryMap.set(created.slug, created.id);
    }
  }

  // 3. Create reusable Pizza customization option groups
  let crustGroupId: string | null = null;
  let addonsGroupId: string | null = null;

  const { data: existingGroups } = await supabase
    .from("option_groups")
    .select("id, name");

  for (const og of existingGroups ?? []) {
    if (og.name === "Crust Choice") crustGroupId = og.id;
    if (og.name === "Extra Add-Ons & Toppings") addonsGroupId = og.id;
  }

  if (!crustGroupId) {
    const { data: crustGroup } = await supabase
      .from("option_groups")
      .insert({
        name: "Crust Choice",
        description: "Select your preferred dough preparation",
        required: true,
        min_select: 1,
        max_select: 1,
        active: true,
      })
      .select("id")
      .single();

    if (crustGroup) {
      crustGroupId = crustGroup.id;
      await supabase.from("option_values").insert([
        {
          option_group_id: crustGroupId,
          name: "48h Classic Sourdough",
          price_delta: 0,
          is_default: true,
          sort_order: 1,
        },
        {
          option_group_id: crustGroupId,
          name: "Roman Thin & Crisp",
          price_delta: 0,
          is_default: false,
          sort_order: 2,
        },
        {
          option_group_id: crustGroupId,
          name: "Cheese Burst Crust",
          price_delta: 89,
          is_default: false,
          sort_order: 3,
        },
      ]);
    }
  }

  if (!addonsGroupId) {
    const { data: addonsGroup } = await supabase
      .from("option_groups")
      .insert({
        name: "Extra Add-Ons & Toppings",
        description: "Customize with extra cheese or artisan toppings",
        required: false,
        min_select: 0,
        max_select: 4,
        active: true,
      })
      .select("id")
      .single();

    if (addonsGroup) {
      addonsGroupId = addonsGroup.id;
      await supabase.from("option_values").insert([
        {
          option_group_id: addonsGroupId,
          name: "Extra Mozzarella Cheese",
          price_delta: 49,
          is_default: false,
          sort_order: 1,
        },
        {
          option_group_id: addonsGroupId,
          name: "Extra Toppings (Olives / Jalapeños)",
          price_delta: 39,
          is_default: false,
          sort_order: 2,
        },
        {
          option_group_id: addonsGroupId,
          name: "Roasted Garlic Dip",
          price_delta: 29,
          is_default: false,
          sort_order: 3,
        },
      ]);
    }
  }

  // 4. Insert products, variants, and option group mappings
  const { data: existingProducts } = await supabase
    .from("products")
    .select("slug");
  const existingProductSlugs = new Set((existingProducts ?? []).map((p) => p.slug));

  let createdCount = 0;
  for (let idx = 0; idx < SAMPLE_PRODUCTS.length; idx++) {
    const p = SAMPLE_PRODUCTS[idx];
    if (existingProductSlugs.has(p.slug)) continue;

    const categoryId = categoryMap.get(p.categorySlug);
    if (!categoryId) continue;

    const stationId = stationMap.get(p.stationName) ?? null;

    const { data: prod } = await supabase
      .from("products")
      .insert({
        category_id: categoryId,
        station_id: stationId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        image_url: p.image_url,
        base_price: p.base_price,
        dietary_type: p.dietary_type,
        is_popular: p.is_popular,
        is_featured: p.is_featured,
        is_chef_special: p.is_chef_special,
        prep_time_minutes: p.prep_time_minutes,
        sort_order: idx + 1,
        active: true,
        available: true,
      })
      .select("id")
      .single();

    if (prod) {
      createdCount++;
      if (p.variants && p.variants.length > 0) {
        await supabase.from("product_variants").insert(
          p.variants.map((v, vIdx) => ({
            product_id: prod.id,
            name: v.name,
            price: v.price,
            is_default: Boolean(v.is_default),
            active: true,
            available: true,
            sort_order: vIdx + 1,
          }))
        );
      }

      if (p.attachPizzaOptions) {
        const mappings: Array<{
          product_id: string;
          option_group_id: string;
          sort_order: number;
        }> = [];
        if (crustGroupId) {
          mappings.push({
            product_id: prod.id,
            option_group_id: crustGroupId,
            sort_order: 1,
          });
        }
        if (addonsGroupId) {
          mappings.push({
            product_id: prod.id,
            option_group_id: addonsGroupId,
            sort_order: 2,
          });
        }
        if (mappings.length > 0) {
          await supabase.from("product_option_groups").insert(mappings);
        }
      }
    }
  }

  // 5. Ensure at least 4 sample tables exist with cryptographic QR tokens if none exist yet
  const { data: existingTables } = await supabase
    .from("tables")
    .select("id")
    .limit(1);

  if (!existingTables || existingTables.length === 0) {
    for (let t = 1; t <= 4; t++) {
      const tableNum = `0${t}`;
      const { data: tableRow } = await supabase
        .from("tables")
        .insert({
          table_number: tableNum,
          label: t <= 2 ? "Window Booth" : "Main Dining",
          capacity: 4,
          active: true,
        })
        .select("id")
        .single();

      if (tableRow) {
        const rawToken = generateSecureToken(24);
        await supabase.from("table_qr_tokens").insert({
          table_id: tableRow.id,
          token_hash: hashToken(rawToken),
          token_prefix: rawToken.slice(0, 8),
          qr_token_secret: rawToken,
          active: true,
        });
      }
    }
  }

  revalidatePath("/admin/menu");
  revalidatePath("/admin/tables");
  revalidatePath("/admin");
  revalidatePath("/menu");

  return {
    success: true,
    createdProducts: createdCount,
  };
}
