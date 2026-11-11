import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { CustomerMenuView } from "@/components/customer/customer-menu-view";
import {
  Category,
  OptionGroup,
  OptionValue,
  Product,
  ProductVariant,
  RestaurantPublicProfile,
} from "@/types/menu";

export const dynamic = "force-dynamic";

export default async function RestaurantPublicMenuPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { session?: string };
}) {
  const { isConfigured } = getSupabasePublicEnv();
  if (!isConfigured) {
    redirect("/setup-required");
  }

  const supabase = await createServerSupabaseClient();

  const { data: restaurantRow, error: restError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", params.slug)
    .eq("active", true)
    .maybeSingle();

  if (restError || !restaurantRow) {
    notFound();
  }

  const restaurant: RestaurantPublicProfile = {
    id: restaurantRow.id,
    name: restaurantRow.name,
    slug: restaurantRow.slug,
    description: restaurantRow.description,
    logo_url: restaurantRow.logo_url,
    cover_image_url: restaurantRow.cover_image_url,
    currency: restaurantRow.currency,
    timezone: restaurantRow.timezone,
    tax_rate: Number(restaurantRow.tax_rate),
    service_charge_rate: Number(restaurantRow.service_charge_rate),
    phone: restaurantRow.phone,
    email: restaurantRow.email,
    address: restaurantRow.address,
    opening_hours:
      (restaurantRow.opening_hours as Record<string, string> | null) ?? {},
    is_accepting_orders: restaurantRow.is_accepting_orders,
    active: restaurantRow.active,
  };

  // Fetch menu categories, products, variants, and option groups
  const [
    { data: catRows },
    { data: prodRows },
    { data: variantRows },
    { data: ogRows },
    { data: ovRows },
    { data: pogRows },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("products")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_variants")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("option_groups")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("active", true),
    supabase
      .from("option_values")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("product_option_groups").select("*").order("sort_order", { ascending: true }),
  ]);

  const categories: Category[] = (catRows ?? []) as Category[];

  const optionGroupMap = new Map<string, OptionGroup>();
  for (const og of ogRows ?? []) {
    const values: OptionValue[] = ((ovRows ?? []) as OptionValue[])
      .filter((ov) => ov.option_group_id === og.id)
      .map((ov) => ({
        ...ov,
        price_delta: Number(ov.price_delta),
      }));

    optionGroupMap.set(og.id, {
      id: og.id,
      restaurant_id: og.restaurant_id,
      name: og.name,
      description: og.description,
      required: og.required,
      min_select: og.min_select,
      max_select: og.max_select,
      active: og.active,
      options: values,
    });
  }

  const products: Product[] = (prodRows ?? []).map((p) => {
    const variants: ProductVariant[] = ((variantRows ?? []) as ProductVariant[])
      .filter((v) => v.product_id === p.id)
      .map((v) => ({ ...v, price: Number(v.price) }));

    const mappedGroups: OptionGroup[] = (pogRows ?? [])
      .filter((m) => m.product_id === p.id)
      .map((m) => optionGroupMap.get(m.option_group_id))
      .filter((g): g is OptionGroup => Boolean(g));

    return {
      ...p,
      base_price: Number(p.base_price),
      variants,
      option_groups: mappedGroups,
    } as Product;
  });

  // Resolve table session context if `?session=` token exists
  let tableContext: {
    tableId: string;
    tableNumber: string;
    tableLabel?: string | null;
    sessionId: string;
    sessionToken: string;
  } | null = null;

  if (searchParams.session) {
    const { data: sessionData } = await supabase.rpc("resolve_session_context", {
      p_session_token: searchParams.session,
    });

    const resolved = sessionData as {
      valid?: boolean;
      restaurant_id?: string;
      table_id?: string;
      table_number?: string;
      table_label?: string | null;
      session_id?: string;
    } | null;

    if (
      resolved?.valid &&
      resolved.restaurant_id === restaurant.id &&
      resolved.table_id &&
      resolved.table_number &&
      resolved.session_id
    ) {
      tableContext = {
        tableId: resolved.table_id,
        tableNumber: resolved.table_number,
        tableLabel: resolved.table_label,
        sessionId: resolved.session_id,
        sessionToken: searchParams.session,
      };
    }
  }

  return (
    <CustomerMenuView
      restaurant={restaurant}
      categories={categories}
      products={products}
      tableContext={tableContext}
    />
  );
}
