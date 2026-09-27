const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "TENANT_A_ACCESS_TOKEN", "TENANT_B_PRODUCT_ID", "TENANT_B_ID"];
for (const key of required) if (!process.env[key]) throw new Error(`Set ${key}`);
const headers = { apikey: process.env.SUPABASE_ANON_KEY, authorization: `Bearer ${process.env.TENANT_A_ACCESS_TOKEN}` };
const read = await fetch(`${process.env.SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(process.env.TENANT_B_PRODUCT_ID)}&select=id`, { headers });
if (!read.ok) throw new Error(`Cross-tenant read request returned ${read.status}: ${await read.text()}`);
const rows = await read.json();
if (rows.length !== 0) throw new Error("FAIL: tenant A read a tenant B product");
console.log("PASS: tenant A cannot read tenant B product (RLS returned no rows).");
const write = await fetch(`${process.env.SUPABASE_URL}/rest/v1/products`, {
  method: "POST", headers: { ...headers, "content-type": "application/json", prefer: "return=representation" },
  body: JSON.stringify({ tenant_id: process.env.TENANT_B_ID, sku: `CROSS-${Date.now()}`, name: "Must be rejected" }),
});
if (write.ok) throw new Error("FAIL: tenant A wrote a product into tenant B");
console.log(`PASS: cross-tenant write rejected by Postgres (HTTP ${write.status}).`);
