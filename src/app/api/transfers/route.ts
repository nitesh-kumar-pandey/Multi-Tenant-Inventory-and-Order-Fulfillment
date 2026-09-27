import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transferSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = transferSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid transfer", details: parsed.error.flatten() }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const x = parsed.data;
  const { data, error } = await supabase.rpc("transfer_stock", { p_from: x.fromWarehouseId, p_to: x.toWarehouseId, p_product: x.productId, p_quantity: x.quantity, p_note: x.note });
  if (error) return NextResponse.json({ error: error.message }, { status: error.message.includes("Insufficient stock") ? 409 : 400 });
  return NextResponse.json({ transferId: data }, { status: 201 });
}
