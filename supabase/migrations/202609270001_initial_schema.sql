
create extension if not exists pgcrypto;

create table public.tenants (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(name) between 2 and 100),
    slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    created_at timestamptz not null default now()
);

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    tenant_id uuid not null references public.tenants(id) on delete restrict,
    full_name text not null default '',
    created_at timestamptz not null default now(),
    unique(id, tenant_id)
);

create function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
    select p.tenant_id
    from public.profiles p
    where p.id = (select auth.uid())
$$;

revoke all on function public.current_tenant_id() from public;
grant execute on function public.current_tenant_id() to authenticated;

create table public.warehouses (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null default public.current_tenant_id()
        references public.tenants(id) on delete cascade,
    name text not null check (char_length(name) between 2 and 100),
    location text not null default '',
    created_at timestamptz not null default now(),
    unique(id, tenant_id),
    unique(tenant_id, name)
);

create table public.products (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null default public.current_tenant_id()
        references public.tenants(id) on delete cascade,
    sku text not null,
    name text not null check (char_length(name) between 1 and 160),
    category text not null default 'General',
    reorder_point integer not null default 10 check (reorder_point >= 0),
    created_at timestamptz not null default now(),
    unique(id, tenant_id),
    unique(tenant_id, sku)
);

create table public.inventory_levels (
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    warehouse_id uuid not null,
    product_id uuid not null,
    quantity integer not null default 0 check (quantity >= 0),
    updated_at timestamptz not null default now(),
    primary key (warehouse_id, product_id),
    foreign key (warehouse_id, tenant_id)
        references public.warehouses(id, tenant_id) on delete cascade,
    foreign key (product_id, tenant_id)
        references public.products(id, tenant_id) on delete cascade
);

create table public.orders (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null default public.current_tenant_id()
        references public.tenants(id) on delete cascade,
    warehouse_id uuid not null,
    order_number text not null,
    status text not null default 'reserved'
        check (status in ('reserved', 'fulfilled', 'cancelled')),
    created_at timestamptz not null default now(),
    unique(id, tenant_id),
    unique(tenant_id, order_number),
    foreign key (warehouse_id, tenant_id)
        references public.warehouses(id, tenant_id)
);

create table public.order_items (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    order_id uuid not null,
    product_id uuid not null,
    quantity integer not null check (quantity > 0),
    foreign key (order_id, tenant_id)
        references public.orders(id, tenant_id) on delete cascade,
    foreign key (product_id, tenant_id)
        references public.products(id, tenant_id) on delete cascade
);

create table public.transfers (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null default public.current_tenant_id()
        references public.tenants(id) on delete cascade,
    from_warehouse_id uuid not null,
    to_warehouse_id uuid not null,
    status text not null default 'completed'
        check (status = 'completed'),
    note text not null default '',
    created_at timestamptz not null default now(),
    check (from_warehouse_id <> to_warehouse_id),
    unique(id, tenant_id),
    foreign key (from_warehouse_id, tenant_id)
        references public.warehouses(id, tenant_id),
    foreign key (to_warehouse_id, tenant_id)
        references public.warehouses(id, tenant_id)
);

create table public.stock_movements (
    id bigint generated always as identity primary key,
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    warehouse_id uuid not null,
    product_id uuid not null,
    quantity_delta integer not null check (quantity_delta <> 0),
    reason text not null
        check (
            reason in (
                'opening',
                'adjustment',
                'order_reservation',
                'order_release',
                'transfer_in',
                'transfer_out'
            )
        ),
    order_id uuid,
    transfer_id uuid,
    created_at timestamptz not null default now(),
    foreign key (warehouse_id, tenant_id)
        references public.warehouses(id, tenant_id),
    foreign key (product_id, tenant_id)
        references public.products(id, tenant_id),
    foreign key (order_id, tenant_id)
        references public.orders(id, tenant_id),
    foreign key (transfer_id, tenant_id)
        references public.transfers(id, tenant_id),
    check ((reason like 'transfer_%') = (transfer_id is not null)),
    check ((reason like 'order_%') = (order_id is not null))
);

create table public.reconciliation_flags (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    warehouse_id uuid not null,
    product_id uuid not null,
    flag_type text not null check (flag_type in ('low_stock', 'drift')),
    observed_quantity integer not null,
    expected_quantity integer not null,
    active boolean not null default true,
    first_seen_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    resolved_at timestamptz,
    foreign key (warehouse_id, tenant_id)
        references public.warehouses(id, tenant_id),
    foreign key (product_id, tenant_id)
        references public.products(id, tenant_id),
    unique (warehouse_id, product_id, flag_type)
);

create index stock_movements_history_idx
    on public.stock_movements (
        tenant_id,
        warehouse_id,
        product_id,
        created_at
    );

create index reconciliation_active_idx
    on public.reconciliation_flags (
        tenant_id,
        active,
        flag_type
    );

-- Tenant context is looked up from auth.uid(); clients cannot choose it.
do $$
declare
    t text;
begin
    foreach t in array array[
        'warehouses',
        'products',
        'inventory_levels',
        'orders',
        'order_items',
        'transfers',
        'stock_movements',
        'reconciliation_flags'
    ]
    loop
        execute format(
            'alter table public.%I enable row level security',
            t
        );

        execute format(
            'create policy tenant_select on public.%I
             for select to authenticated
             using (tenant_id = (select public.current_tenant_id()))',
            t
        );

        execute format(
            'create policy tenant_insert on public.%I
             for insert to authenticated
             with check (tenant_id = (select public.current_tenant_id()))',
            t
        );

        execute format(
            'create policy tenant_update on public.%I
             for update to authenticated
             using (tenant_id = (select public.current_tenant_id()))
             with check (tenant_id = (select public.current_tenant_id()))',
            t
        );

        execute format(
            'create policy tenant_delete on public.%I
             for delete to authenticated
             using (tenant_id = (select public.current_tenant_id()))',
            t
        );
    end loop;
end
$$;

alter table public.tenants enable row level security;

create policy tenant_read_own
on public.tenants
for select
to authenticated
using (id = (select public.current_tenant_id()));

alter table public.profiles enable row level security;

create policy profile_read_own
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy profile_update_own
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (
    id = (select auth.uid())
    and tenant_id = (select public.current_tenant_id())
);

create function public.create_tenant(
    p_name text,
    p_slug text,
    p_full_name text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_id uuid;
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;

    if exists (
        select 1
        from public.profiles
        where id = auth.uid()
    ) then
        raise exception 'User already belongs to a tenant';
    end if;

    insert into public.tenants(name, slug)
    values (
        trim(p_name),
        lower(trim(p_slug))
    )
    returning id into v_id;

    insert into public.profiles(
        id,
        tenant_id,
        full_name
    )
    values (
        auth.uid(),
        v_id,
        coalesce(
            nullif(trim(p_full_name), ''),
            'Team member'
        )
    );

    insert into public.warehouses(
        tenant_id,
        name,
        location
    )
    values (
        v_id,
        'Main warehouse',
        'Primary location'
    );

    return v_id;
end
$$;

revoke all on function public.create_tenant(text, text, text) from public;
grant execute on function public.create_tenant(text, text, text) to authenticated;

-- One conditional UPDATE checks availability and reserves;
-- failure aborts the whole transaction.
create function public.apply_stock_delta(
    p_tenant uuid,
    p_warehouse uuid,
    p_product uuid,
    p_delta integer,
    p_reason text,
    p_order uuid default null,
    p_transfer uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_qty integer;
begin
    insert into public.inventory_levels(
        tenant_id,
        warehouse_id,
        product_id,
        quantity
    )
    values (
        p_tenant,
        p_warehouse,
        p_product,
        0
    )
    on conflict (warehouse_id, product_id)
    do nothing;

    update public.inventory_levels
    set
        quantity = quantity + p_delta,
        updated_at = now()
    where tenant_id = p_tenant
      and warehouse_id = p_warehouse
      and product_id = p_product
      and quantity + p_delta >= 0
    returning quantity into v_qty;

    if not found then
        raise exception 'Insufficient stock'
            using errcode = 'P0001';
    end if;

    insert into public.stock_movements(
        tenant_id,
        warehouse_id,
        product_id,
        quantity_delta,
        reason,
        order_id,
        transfer_id
    )
    values (
        p_tenant,
        p_warehouse,
        p_product,
        p_delta,
        p_reason,
        p_order,
        p_transfer
    );
end
$$;

revoke all on function public.apply_stock_delta(
    uuid,
    uuid,
    uuid,
    integer,
    text,
    uuid,
    uuid
) from public, anon, authenticated;

create function public.create_order(
    p_warehouse uuid,
    p_order_number text,
    p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_tenant uuid := public.current_tenant_id();
    v_order uuid;
    item jsonb;
    v_product uuid;
    v_quantity integer;
begin
    if auth.uid() is null or v_tenant is null then
        raise exception 'Authentication required';
    end if;

    if jsonb_typeof(p_items) <> 'array'
       or jsonb_array_length(p_items) = 0 then
        raise exception 'Order must contain items';
    end if;

    if not exists (
        select 1
        from public.warehouses
        where id = p_warehouse
          and tenant_id = v_tenant
    ) then
        raise exception 'Warehouse not found';
    end if;

    insert into public.orders(
        tenant_id,
        warehouse_id,
        order_number
    )
    values (
        v_tenant,
        p_warehouse,
        p_order_number
    )
    returning id into v_order;

    for item in
        select value
        from jsonb_array_elements(p_items)
        order by (value ->> 'product_id')
    loop
        v_product := (item ->> 'product_id')::uuid;
        v_quantity := (item ->> 'quantity')::integer;

        if v_quantity <= 0 then
            raise exception 'Quantity must be positive';
        end if;

        if not exists (
            select 1
            from public.products
            where id = v_product
              and tenant_id = v_tenant
        ) then
            raise exception 'Product not found';
        end if;

        insert into public.order_items(
            tenant_id,
            order_id,
            product_id,
            quantity
        )
        values (
            v_tenant,
            v_order,
            v_product,
            v_quantity
        );

        perform public.apply_stock_delta(
            v_tenant,
            p_warehouse,
            v_product,
            -v_quantity,
            'order_reservation',
            v_order,
            null
        );
    end loop;

    return v_order;
end
$$;

revoke all on function public.create_order(
    uuid,
    text,
    jsonb
) from public;

grant execute on function public.create_order(
    uuid,
    text,
    jsonb
) to authenticated;

revoke insert, update, delete
on public.orders,
   public.order_items,
   public.transfers,
   public.reconciliation_flags
from authenticated;

create function public.transfer_stock(
    p_from uuid,
    p_to uuid,
    p_product uuid,
    p_quantity integer,
    p_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_tenant uuid := public.current_tenant_id();
    v_transfer uuid;
begin
    if auth.uid() is null or v_tenant is null then
        raise exception 'Authentication required';
    end if;

    if p_quantity <= 0 or p_from = p_to then
        raise exception 'Invalid transfer';
    end if;

    if (
        select count(*)
        from public.warehouses
        where tenant_id = v_tenant
          and id in (p_from, p_to)
    ) <> 2 then
        raise exception 'Warehouse not found';
    end if;

    insert into public.transfers(
        tenant_id,
        from_warehouse_id,
        to_warehouse_id,
        note
    )
    values (
        v_tenant,
        p_from,
        p_to,
        coalesce(p_note, '')
    )
    returning id into v_transfer;

    perform public.apply_stock_delta(
        v_tenant,
        p_from,
        p_product,
        -p_quantity,
        'transfer_out',
        null,
        v_transfer
    );

    perform public.apply_stock_delta(
        v_tenant,
        p_to,
        p_product,
        p_quantity,
        'transfer_in',
        null,
        v_transfer
    );

    return v_transfer;
end
$$;

revoke all on function public.transfer_stock(
    uuid,
    uuid,
    uuid,
    integer,
    text
) from public;

grant execute on function public.transfer_stock(
    uuid,
    uuid,
    uuid,
    integer,
    text
) to authenticated;

create function public.create_product_with_stock(
    p_sku text,
    p_name text,
    p_category text,
    p_reorder integer,
    p_warehouse uuid,
    p_quantity integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_tenant uuid := public.current_tenant_id();
    v_product uuid;
begin
    if auth.uid() is null or v_tenant is null then
        raise exception 'Authentication required';
    end if;

    if p_quantity < 0 or p_reorder < 0 then
        raise exception 'Quantities cannot be negative';
    end if;

    if not exists (
        select 1
        from public.warehouses
        where id = p_warehouse
          and tenant_id = v_tenant
    ) then
        raise exception 'Warehouse not found';
    end if;

    insert into public.products(
        tenant_id,
        sku,
        name,
        category,
        reorder_point
    )
    values (
        v_tenant,
        trim(p_sku),
        trim(p_name),
        coalesce(
            nullif(trim(p_category), ''),
            'General'
        ),
        p_reorder
    )
    returning id into v_product;

    if p_quantity > 0 then
        perform public.apply_stock_delta(
            v_tenant,
            p_warehouse,
            v_product,
            p_quantity,
            'opening',
            null,
            null
        );
    end if;

    return v_product;
end
$$;

revoke all on function public.create_product_with_stock(
    text,
    text,
    text,
    integer,
    uuid,
    integer
) from public;

grant execute on function public.create_product_with_stock(
    text,
    text,
    text,
    integer,
    uuid,
    integer
) to authenticated;

create function public.reject_movement_mutation()
returns trigger
language plpgsql
as $$
begin
    raise exception 'Stock movement history is append-only';
end
$$;

create trigger stock_movements_immutable
before update or delete
on public.stock_movements
for each row
execute function public.reject_movement_mutation();

revoke insert, update, delete
on public.stock_movements
from authenticated;

revoke insert, update, delete
on public.inventory_levels
from authenticated;

-- Repeated runs upsert one flag per location, product and type.
create function public.run_reconciliation()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_count integer;
begin

    insert into public.reconciliation_flags(
        tenant_id,
        warehouse_id,
        product_id,
        flag_type,
        observed_quantity,
        expected_quantity,
        active,
        last_seen_at,
        resolved_at
    )
    select
        l.tenant_id,
        l.warehouse_id,
        l.product_id,
        'drift',
        l.quantity,
        coalesce(sum(m.quantity_delta), 0),
        true,
        now(),
        null
    from public.inventory_levels l
    left join public.stock_movements m
        using (tenant_id, warehouse_id, product_id)
    group by
        l.tenant_id,
        l.warehouse_id,
        l.product_id,
        l.quantity
    having l.quantity <> coalesce(sum(m.quantity_delta), 0)
    on conflict (warehouse_id, product_id, flag_type)
    do update set
        observed_quantity = excluded.observed_quantity,
        expected_quantity = excluded.expected_quantity,
        active = true,
        last_seen_at = now(),
        resolved_at = null;

    insert into public.reconciliation_flags(
        tenant_id,
        warehouse_id,
        product_id,
        flag_type,
        observed_quantity,
        expected_quantity,
        active,
        last_seen_at,
        resolved_at
    )
    select
        l.tenant_id,
        l.warehouse_id,
        l.product_id,
        'low_stock',
        l.quantity,
        p.reorder_point,
        true,
        now(),
        null
    from public.inventory_levels l
    join public.products p
        on p.id = l.product_id
        and p.tenant_id = l.tenant_id
    where l.quantity <= p.reorder_point
    on conflict (warehouse_id, product_id, flag_type)
    do update set
        observed_quantity = excluded.observed_quantity,
        expected_quantity = excluded.expected_quantity,
        active = true,
        last_seen_at = now(),
        resolved_at = null;

    update public.reconciliation_flags f
    set
        active = false,
        resolved_at = now()
    where f.active
      and (
        (
            f.flag_type = 'low_stock'
            and not exists (
                select 1
                from public.inventory_levels l
                join public.products p
                    on p.id = l.product_id
                    and p.tenant_id = l.tenant_id
                where l.warehouse_id = f.warehouse_id
                  and l.product_id = f.product_id
                  and l.quantity <= p.reorder_point
            )
        )
        or
        (
            f.flag_type = 'drift'
            and exists (
                select 1
                from public.inventory_levels l
                left join public.stock_movements m
                    using (tenant_id, warehouse_id, product_id)
                where l.warehouse_id = f.warehouse_id
                  and l.product_id = f.product_id
                group by
                    l.quantity
                having l.quantity = coalesce(
                    sum(m.quantity_delta),
                    0
                )
            )
        )
    );

    get diagnostics v_count = row_count;

    return v_count;
end
$$;

revoke all on function public.run_reconciliation() from public;

grant execute on function public.run_reconciliation() to service_role;