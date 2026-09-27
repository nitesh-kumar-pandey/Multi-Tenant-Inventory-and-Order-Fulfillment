const required = ["TEST_BASE_URL", "TEST_ACCESS_TOKEN", "TEST_WAREHOUSE_ID", "TEST_PRODUCT_ID"];
for (const key of required) if (!process.env[key]) throw new Error(`Set ${key}`);
const count = Number(process.env.TEST_CONCURRENT_ORDERS ?? 8);
if (!Number.isInteger(count) || count < 2) throw new Error("TEST_CONCURRENT_ORDERS must be at least 2");
const headers = { "content-type": "application/json", authorization: `Bearer ${process.env.TEST_ACCESS_TOKEN}` };
const attempts = await Promise.all(Array.from({ length: count }, (_, i) => fetch(`${process.env.TEST_BASE_URL}/api/orders`, {
  method: "POST", headers,
  body: JSON.stringify({ warehouseId: process.env.TEST_WAREHOUSE_ID, orderNumber: `CONC-${Date.now()}-${i}`, items: [{ productId: process.env.TEST_PRODUCT_ID, quantity: 1 }] }),
}).then(async response => ({ status: response.status, body: await response.json() }))));
const succeeded = attempts.filter(x => x.status === 201);
const rejected = attempts.filter(x => x.status === 409 && x.body.error === "Insufficient stock");
console.table(attempts.map((x, i) => ({ attempt: i + 1, status: x.status, result: x.body.error ?? "reserved" })));
if (succeeded.length !== 1 || rejected.length !== count - 1) {
  console.error(`Expected one reservation and ${count - 1} insufficient-stock responses; got ${succeeded.length} and ${rejected.length}.`);
  process.exitCode = 1;
} else console.log("PASS: exactly one competing order reserved the last unit.");
