/**
 * TableTap Menu Domain Types (Single-Restaurant Architecture)
 * Matches the editorial culinary presentation requirements and PostgreSQL schema.
 */

export type DietaryType = "veg" | "non-veg" | "vegan" | "egg";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku?: string | null;
  price: number;
  is_default: boolean;
  active: boolean;
  available: boolean;
  sort_order: number;
}

export interface OptionValue {
  id: string;
  option_group_id: string;
  name: string;
  price_delta: number;
  is_default: boolean;
  active: boolean;
  sort_order: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  description?: string | null;
  required: boolean;
  min_select: number;
  max_select: number;
  active: boolean;
  options: OptionValue[];
}

export interface Product {
  id: string;
  category_id: string;
  station_id?: string | null;
  station_name?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  base_price: number;
  dietary_type: DietaryType;
  is_popular: boolean;
  is_featured: boolean;
  is_chef_special: boolean;
  prep_time_minutes: number;
  sort_order: number;
  active: boolean;
  available: boolean;
  variants?: ProductVariant[];
  option_groups?: OptionGroup[];
  created_at: string;
  updated_at: string;
}

export interface RestaurantPublicProfile {
  id?: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  currency: string;
  timezone: string;
  tax_rate: number;
  service_charge_rate: number;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  opening_hours: Record<string, string>;
  is_accepting_orders: boolean;
}
