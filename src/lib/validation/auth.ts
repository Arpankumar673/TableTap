import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const restaurantRegisterSchema = z.object({
  restaurantName: z.string().min(2, "Restaurant name must be at least 2 characters"),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug cannot exceed 50 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  ownerEmail: z.string().email("Please enter a valid owner email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  phone: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RestaurantRegisterInput = z.infer<typeof restaurantRegisterSchema>;
