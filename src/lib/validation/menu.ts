import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters").max(60),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(300).optional().nullable(),
  image_url: z.string().url("Must be a valid image URL").optional().nullable(),
  sort_order: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const optionValueSchema = z.object({
  name: z.string().min(1, "Option name required").max(60),
  price_delta: z.number().min(0, "Price delta cannot be negative"),
  is_default: z.boolean().default(false),
  active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const optionGroupSchema = z.object({
  name: z.string().min(2, "Option group name required").max(60),
  required: z.boolean().default(false),
  min_select: z.number().int().min(0).default(0),
  max_select: z.number().int().min(1).default(1),
  options: z.array(optionValueSchema).min(1, "At least one option value is required"),
});

export const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  category_id: z.string().uuid("Invalid category ID"),
  station_id: z.string().uuid("Invalid station ID").optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  image_url: z.string().url("Must be a valid URL").optional().nullable(),
  base_price: z.number().positive("Base price must be greater than zero"),
  dietary_type: z.enum(["veg", "non-veg", "vegan", "egg"]).default("veg"),
  is_popular: z.boolean().default(false),
  is_chef_special: z.boolean().default(false),
  active: z.boolean().default(true),
  available: z.boolean().default(true),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type OptionGroupInput = z.infer<typeof optionGroupSchema>;
export type OptionValueInput = z.infer<typeof optionValueSchema>;
