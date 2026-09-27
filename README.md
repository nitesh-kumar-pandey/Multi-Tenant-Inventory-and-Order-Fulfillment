# Stockroom

A multi-tenant inventory and order-fulfillment prototype built with Next.js App Router, TypeScript, Tailwind CSS v4, Zod, and Supabase on PostgreSQL 17. It focuses on tenant isolation and transactionally safe stock changes. There are no payment, storefront, or carrier integrations.

## Stack

- Next.js 16.2 and React 19, with TypeScript 6.0.3
- Node.js 24 (see `engines` in `package.json`)
- Tailwind CSS v4
- Supabase Auth, Postgres 17, and Supabase CLI local development
- Zod 4.4.3 at form and API boundaries
- Vercel deployment with an hourly Cron route

## Run locally

1. Install Node 24 and the Supabase CLI (v2.109 or newer).
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local`. For local Supabase, the default URL is `http://127.0.0.1:54330`; get the anon and service-role keys from `supabase status`.
4. Run `npm run supabase:start`, then `npm run db:reset` to create the Postgres 17 database and apply migrations.
5. Set a long random `CRON_SECRET` in `.env.local`.
6. Run `npm run dev` and open `http://localhost:3000`. Create a workspace at `/signup`.

The Supabase auth config disables email confirmation for local use. Configure email confirmation and production redirect URLs in the hosted Supabase project before launch.

## Tenant isolation

`profiles.id` references the authenticated Supabase user and each profile has exactly one `tenant_id`. A profile's tenant cannot be updated by the user. `current_tenant_id()` derives the active tenant from `auth.uid()`; clients never supply the security context. Every tenant-owned table, including products, warehouses, inventory, orders, transfers, movements, and reconciliation flags, has RLS enabled and policies compare its `tenant_id` with that function. Composite foreign keys include `tenant_id`, preventing cross-tenant product, warehouse, order, and transfer references even in writes.

Tenant creation is an authenticated `create_tenant` security-definer function that creates the tenant, profile, and initial warehouse in one transaction. The function refuses a user who already has a profile. The signup UI/API validates with Zod; the database also enforces slug/name constraints.

Sensitive writes are restricted to database functions. Authenticated users cannot directly write stock balances, movement history, order rows/items, transfers, or reconciliation flags. The movement ledger is append-only. Security-definer functions pin `search_path` to the empty path and qualify object names.

### Adversarial RLS check

Create two accounts and two workspaces through `/signup`, then add a product to each via `POST /api/products`. Sign in as account A and obtain a session access token. Call the Supabase REST endpoint directly with account A's anon key and token, using the known product UUID belonging to account B:

```sh
curl 'http://127.0.0.1:54330/rest/v1/products?id=eq.SECOND_TENANT_PRODUCT_UUID&select=*' \
  -H 'apikey: LOCAL_ANON_KEY' -H 'Authorization: Bearer ACCOUNT_A_ACCESS_TOKEN'
```

Expected result: an empty array. Try a direct insert with `tenant_id` set to tenant B: Postgres rejects it under RLS. Try direct inserts into `orders`, `order_items`, `transfers`, `inventory_levels`, or `stock_movements`: table privileges reject these paths. Service-role credentials bypass RLS by design and must remain server-only.

The repeatable direct-API check is `npm run test:rls`. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TENANT_A_ACCESS_TOKEN`, `TENANT_B_PRODUCT_ID`, and `TENANT_B_ID` in the shell. The script asserts that the cross-tenant read is empty and a cross-tenant product insert is rejected.

## Atomic order reservation and transfers

`POST /api/orders` validates the request with Zod and calls `create_order`. The function inserts the order and each line item, then calls `apply_stock_delta` for each item in the same Postgres transaction. `apply_stock_delta` performs one conditional update: `quantity = quantity + delta WHERE quantity + delta >= 0`. PostgreSQL serializes competing updates to the same balance row. The losing request rechecks the predicate after the lock is released, updates zero rows, and raises `Insufficient stock`; the exception rolls back the entire order and all its line items. The API responds with HTTP 409. There is no application-level read-then-write availability check.

Multi-item order lines are processed in product UUID order to reduce deadlock risk. Each reservation updates the cached quantity and appends its matching immutable movement in the same transaction.

`POST /api/transfers` calls `transfer_stock`. One transfer row links both warehouse changes; source debit and destination credit happen in the same transaction. If either operation fails, the transfer row and both balance/history changes roll back together.

To run the simultaneous last-unit check, first make the selected product's warehouse balance exactly one unit. Set `TEST_BASE_URL`, `TEST_ACCESS_TOKEN`, `TEST_WAREHOUSE_ID`, and `TEST_PRODUCT_ID`, then run `npm run test:concurrency`. It fires eight parallel one-unit orders by default and passes only when exactly one returns 201 and every other response is HTTP 409 `Insufficient stock`. This is an integration check against your local or hosted test project; it consumes that one unit and creates the winning order.

## Reconciliation

`GET /api/cron/reconcile` is configured hourly in `vercel.json`. Vercel sends `Authorization: Bearer $CRON_SECRET`; the route rejects calls without the secret and invokes the reconciliation function using the server-only service-role key. The database compares each cached location quantity with `SUM(stock_movements.quantity_delta)` and detects low stock against the product reorder point. A unique key on `(warehouse_id, product_id, flag_type)` makes repeated runs upsert the same flags; conditions that clear are marked inactive with a resolution time. The job does not modify stock.

For local manual invocation, request `/api/cron/reconcile` with the configured bearer secret. Set the same secret in Vercel project environment variables when deploying.

## HTTP endpoints

- `POST /api/tenants` — create authenticated tenant/workspace (Zod validated)
- `POST /api/products` — create a product and optional opening stock movement
- `POST /api/orders` — reserve order lines atomically
- `POST /api/transfers` — move stock between same-tenant warehouses atomically
- `GET /api/cron/reconcile` — authenticated scheduled reconciliation

All authenticated API endpoints use the caller's Supabase session. The database function obtains tenant identity from that authenticated profile.

## Deploy

Create a Supabase project on PostgreSQL 17, link the CLI project, and run `supabase db push`. Configure the three Supabase environment values and `CRON_SECRET` in Vercel. Deploy the repository; Vercel reads `vercel.json` for its hourly schedule. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. A live URL and GitHub repository are not included because this environment has no account credentials or remote configured.

## Next week

I would connect the overview to tenant-scoped live queries, add role-based team permissions, and complete warehouse/product management screens. Then I would run adversarial tests against two real Supabase auth sessions and load-test competing order requests against a hosted Postgres instance before production use.
