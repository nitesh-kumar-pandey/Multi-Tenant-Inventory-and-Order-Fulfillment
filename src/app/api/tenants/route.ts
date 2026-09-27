import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tenantSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = tenantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid tenant details", details: parsed.error.flatten() }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Create an account before setting up a workspace" }, { status: 401 });
  const { data, error } = await supabase.rpc("create_tenant", { p_name: parsed.data.name, p_slug: parsed.data.slug, p_full_name: parsed.data.fullName });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ tenantId: data }, { status: 201 });
}
