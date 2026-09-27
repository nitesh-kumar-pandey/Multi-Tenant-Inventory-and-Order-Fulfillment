import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { data, error } = await createAdminClient().rpc("run_reconciliation");
    if (error) throw error;
    return NextResponse.json({ ok: true, affectedFlags: data, ranAt: new Date().toISOString() });
  } catch (error) {
    console.error("Reconciliation failed", error);
    return NextResponse.json({ error: "Reconciliation failed" }, { status: 500 });
  }
}
