import { z } from "zod";

export const orderItemInputSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  variantId: z.string().uuid("Invalid variant ID").optional().nullable(),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1")
    .max(50, "Quantity cannot exceed 50"),
  optionValueIds: z.array(z.string().uuid("Invalid option value ID")).default([]),
  notes: z
    .string()
    .max(200, "Special instructions cannot exceed 200 characters")
    .optional()
    .nullable(),
});

export const orderSubmissionSchema = z.object({
  sessionToken: z.string().min(16, "Valid table session token required"),
  idempotencyKey: z.string().uuid("Valid idempotency key required"),
  items: z
    .array(orderItemInputSchema)
    .min(1, "At least one item is required to place an order")
    .max(100, "Too many line items in a single order"),
  customerNotes: z
    .string()
    .max(500, "Order notes cannot exceed 500 characters")
    .optional()
    .nullable(),
});

export const orderStatusUpdateSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  newStatus: z.enum([
    "pending",
    "accepted",
    "preparing",
    "ready",
    "served",
    "completed",
    "cancelled",
  ]),
  reason: z.string().max(250).optional().nullable(),
});

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type OrderSubmissionInput = z.infer<typeof orderSubmissionSchema>;
export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;
