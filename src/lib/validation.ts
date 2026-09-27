import { z } from "zod";

export const tenantSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80),
  fullName: z.string().trim().max(120).default(""),
});

export const orderSchema = z.object({
  warehouseId: z.uuid(),
  orderNumber: z.string().trim().min(1).max(80),
  items: z.array(z.object({ productId: z.uuid(), quantity: z.number().int().positive().max(100000) })).min(1).max(100),
});

export const transferSchema = z.object({
  fromWarehouseId: z.uuid(), toWarehouseId: z.uuid(), productId: z.uuid(),
  quantity: z.number().int().positive().max(100000), note: z.string().max(500).default(""),
}).refine(x => x.fromWarehouseId !== x.toWarehouseId, { message: "Warehouses must be different" });

export const productSchema = z.object({
  sku: z.string().trim().min(1).max(80), name: z.string().trim().min(1).max(160),
  category: z.string().trim().max(80).default("General"), reorderPoint: z.number().int().nonnegative(),
  warehouseId: z.uuid(), quantity: z.number().int().nonnegative(),
});
