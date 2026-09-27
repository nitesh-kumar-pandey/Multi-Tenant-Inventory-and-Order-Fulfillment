import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid product", details: parsed.error.flatten() }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const x = parsed.data;
  const { data, error } = await supabase.rpc("create_product_with_stock", { p_sku: x.sku, p_name: x.name, p_category: x.category, p_reorder: x.reorderPoint, p_warehouse: x.warehouseId, p_quantity: x.quantity });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ productId: data }, { status: 201 });
}
