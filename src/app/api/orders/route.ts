import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { orderSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = orderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid order", details: parsed.error.flatten() }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { data, error } = await supabase.rpc("create_order", {
    p_warehouse: parsed.data.warehouseId,
    p_order_number: parsed.data.orderNumber,
    p_items: parsed.data.items.map(item => ({ product_id: item.productId, quantity: item.quantity })),
  });
  if (error) {
    const insufficient = error.message.includes("Insufficient stock");
    return NextResponse.json({ error: insufficient ? "Insufficient stock" : error.message }, { status: insufficient ? 409 : 400 });
  }
  return NextResponse.json({ orderId: data }, { status: 201 });
}
