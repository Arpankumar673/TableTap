import { requireRestaurantRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MenuManager } from "@/components/admin/menu-manager";
import { Category, OptionGroup, OptionValue, Product, ProductVariant } from "@/types/menu";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Menu & Catalog | TableTap Admin",
};

export default async function AdminMenuPage() {
  const ctx = await requireRestaurantRole(["owner", "admin"]);
  const supabase = await createServerSupabaseClient();
  const restaurantId = ctx.restaurant.id;

  const [
    { data: catRows },
    { data: prodRows },
    { data: variantRows },
    { data: ogRows },
    { data: ovRows },
    { data: pogRows },
    { data: stationRows },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("products")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_variants")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("option_groups")
      .select("*")
      .eq("restaurant_id", restaurantId),
    supabase
      .from("option_values")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase.from("product_option_groups").select("*"),
    supabase
      .from("preparation_stations")
      .select("id, name")
      .eq("restaurant_id", restaurantId)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
  ]);

  const optionGroups: OptionGroup[] = (ogRows ?? []).map((g) => ({
    id: g.id,
    restaurant_id: g.restaurant_id,
    name: g.name,
    description: g.description,
    required: g.required,
    min_select: g.min_select,
    max_select: g.max_select,
    active: g.active,
    options: ((ovRows ?? []) as OptionValue[])
      .filter((v) => v.option_group_id === g.id)
      .map((v) => ({ ...v, price_delta: Number(v.price_delta) })),
  }));

  const products: Product[] = (prodRows ?? []).map((p) => ({
    ...p,
    base_price: Number(p.base_price),
    variants: ((variantRows ?? []) as ProductVariant[])
      .filter((v) => v.product_id === p.id)
      .map((v) => ({ ...v, price: Number(v.price) })),
    option_groups: (pogRows ?? [])
      .filter((m) => m.product_id === p.id)
      .map((m) => optionGroups.find((g) => g.id === m.option_group_id))
      .filter((g): g is OptionGroup => Boolean(g)),
  })) as Product[];

  return (
    <MenuManager
      restaurantId={restaurantId}
      currency={ctx.restaurant.currency || "INR"}
      initialCategories={(catRows ?? []) as Category[]}
      initialProducts={products}
      initialOptionGroups={optionGroups}
      stations={stationRows ?? []}
    />
  );
}
