"use client";

import { FormEvent, useState } from "react";
import { Boxes, Check, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { z } from "zod";

const signupSchema = z.object({ business: z.string().trim().min(2).max(100), fullName: z.string().trim().min(1).max(120), email: z.email(), password: z.string().min(8).max(128) });

export default function SignupPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    const parsed = signupSchema.safeParse({ business: form.get("business"), fullName: form.get("fullName"), email: form.get("email"), password: form.get("password") });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check your details and try again."); setBusy(false); return; }
    const { business: name, email, password, fullName } = parsed.data;
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const supabase = createClient();
    const { error: signupError } = await supabase.auth.signUp({ email, password });
    if (signupError) { setError(signupError.message); setBusy(false); return; }
    const tenantResponse = await fetch("/api/tenants", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, slug, fullName }) });
    if (!tenantResponse.ok) { const body = await tenantResponse.json(); setError(body.error ?? "Could not create workspace."); setBusy(false); return; }
    window.location.assign("/");
  }
  return <main className="app-grid flex min-h-screen items-center justify-center p-5"><div className="w-full max-w-[430px] rounded-2xl border border-[#e6eae2] bg-white p-8 shadow-[0_16px_70px_rgba(35,57,47,.07)] sm:p-10"><div className="mb-8 flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-[#174f40] text-[#d5f178]"><Boxes size={21}/></div><span className="text-lg font-bold tracking-tight">stockroom</span></div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.15em] text-[#74877a]">Get started for free</p><h1 className="text-[27px] font-semibold tracking-tight">Your inventory, in sync.</h1><p className="mt-2 text-sm leading-relaxed text-[#7d8980]">Create a workspace for your team. No card required.</p><form onSubmit={submit} className="mt-7 space-y-4"><Input name="business" label="Business name" placeholder="Northstar Goods" required/><Input name="fullName" label="Your name" placeholder="Alex Morgan" required/><Input name="email" label="Work email" placeholder="you@company.com" type="email" required/><Input name="password" label="Password" placeholder="At least 8 characters" type="password" minLength={8} required/>{error&&<p role="alert" className="rounded-lg bg-[#fff0ed] px-3 py-2 text-xs text-[#a84f45]">{error}</p>}<button disabled={busy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#205c47] py-3 text-sm font-semibold text-white hover:bg-[#174b39] disabled:opacity-60">{busy?<LoaderCircle className="animate-spin" size={16}/>:<Check size={16}/>}Create workspace</button></form><p className="mt-5 text-center text-[10px] leading-relaxed text-[#96a098]">By continuing, you agree to the Terms of Service and Privacy Policy.</p></div></main>;
}
function Input({name,label,placeholder,type="text",required=false,minLength}:{name:string;label:string;placeholder:string;type?:string;required?:boolean;minLength?:number}) { return <label className="block text-xs font-semibold text-[#526359]">{label}<input name={name} type={type} placeholder={placeholder} required={required} minLength={minLength} className="mt-1.5 w-full rounded-lg border border-[#e5ebe4] px-3 py-2.5 text-sm font-normal text-[#24382d] outline-none transition placeholder:text-[#adb6ae] focus:border-[#77a18a]"/></label> }
