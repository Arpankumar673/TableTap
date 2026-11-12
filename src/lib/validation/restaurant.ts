import { z } from "zod";

export const restaurantSettingsSchema = z.object({
  name: z.string().min(2, "Restaurant name must be at least 2 characters").max(150),
  description: z.string().max(500).optional().nullable(),
  currency: z.string().min(3).max(10).default("INR"),
  timezone: z.string().min(2).max(60).default("Asia/Kolkata"),
  tax_rate: z.number().min(0).max(50).default(5),
  service_charge_rate: z.number().min(0).max(30).default(0),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  address: z.string().max(300).optional().nullable(),
  is_accepting_orders: z.boolean().default(true),
});

export const stationSchema = z.object({
  name: z.string().min(2, "Station name is required").max(80),
  description: z.string().max(200).optional().nullable(),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color").default("#1B5E3A"),
  sort_order: z.number().int().default(0),
  active: z.boolean().default(true),
});

export type RestaurantSettingsInput = z.infer<typeof restaurantSettingsSchema>;
export type StationInput = z.infer<typeof stationSchema>;
