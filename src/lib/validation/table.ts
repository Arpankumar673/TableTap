import { z } from "zod";

export const tableSchema = z.object({
  table_number: z.string().min(1, "Table number is required").max(10),
  label: z.string().max(50).optional().nullable(),
  capacity: z.number().int().min(1, "Capacity must be at least 1").max(50).default(4),
  active: z.boolean().default(true),
});

export const qrTokenGenerateSchema = z.object({
  tableId: z.string().uuid("Invalid table ID"),
});

export type TableInput = z.infer<typeof tableSchema>;
export type QrTokenGenerateInput = z.infer<typeof qrTokenGenerateSchema>;
