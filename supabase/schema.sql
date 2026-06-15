-- 3D Shop schema
-- Run in Supabase SQL Editor (Project → SQL Editor → New query → paste → Run)

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- Enums
-- ============================================================================
do $$ begin
  create type product_category as enum ('chaveiros', 'escritorio', 'criaturas');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum (
    'awaiting_payment', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'canceled', 'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- Tables
-- ============================================================================

-- users (NextAuth credentials provider — password hashed with bcrypt)
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  name          text,
  role          user_role not null default 'user',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- products
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  category    product_category not null,
  base_price  numeric(10,2) not null check (base_price >= 0),
  image_url   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- product_options (size/color/material variations)
create table if not exists public.product_options (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products(id) on delete cascade,
  name            text not null,
  price_modifier  numeric(10,2) not null default 0,
  stock           integer not null default 0 check (stock >= 0),
  dimensions      text,
  created_at      timestamptz not null default now()
);

-- cart_items
create table if not exists public.cart_items (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  product_id         uuid not null references public.products(id) on delete cascade,
  product_option_id  uuid references public.product_options(id) on delete set null,
  quantity           integer not null default 1 check (quantity > 0),
  created_at         timestamptz not null default now()
);

-- orders
create table if not exists public.orders (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.users(id) on delete restrict,
  stripe_session_id        text unique,
  stripe_payment_intent_id text unique,
  status                   order_status not null default 'pending',
  total                    numeric(10,2) not null check (total >= 0),
  shipping_address         jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- order_items (snapshot to preserve historical pricing/details)
create table if not exists public.order_items (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders(id) on delete cascade,
  product_id         uuid not null references public.products(id) on delete restrict,
  product_option_id  uuid references public.product_options(id) on delete set null,
  quantity           integer not null check (quantity > 0),
  unit_price         numeric(10,2) not null check (unit_price >= 0),
  product_snapshot   jsonb,
  created_at         timestamptz not null default now()
);

-- coupons
create table if not exists public.coupons (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  discount_type  text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value >= 0),
  min_purchase   numeric(10,2) not null default 0,
  max_uses       integer,
  used_count     integer not null default 0,
  free_shipping  boolean not null default false,
  active         boolean not null default true,
  expires_at     timestamptz,
  created_at     timestamptz not null default now()
);

-- ============================================================================
-- Indexes
-- ============================================================================
create index if not exists idx_products_category       on public.products(category) where active = true;
create index if not exists idx_products_active         on public.products(active);
create index if not exists idx_product_options_product on public.product_options(product_id);
create index if not exists idx_cart_items_user         on public.cart_items(user_id);
create index if not exists idx_orders_user             on public.orders(user_id);
create index if not exists idx_orders_status           on public.orders(status);
create index if not exists idx_orders_stripe_session   on public.orders(stripe_session_id);
create index if not exists idx_order_items_order       on public.order_items(order_id);

-- ============================================================================
-- updated_at trigger
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS
-- All access goes through Next.js API routes using the service-role key.
-- We disable RLS to keep things simple — the API layer is the security boundary.
-- ============================================================================
alter table public.users           disable row level security;
alter table public.products        disable row level security;
alter table public.product_options disable row level security;
alter table public.cart_items      disable row level security;
alter table public.orders          disable row level security;
alter table public.order_items     disable row level security;
alter table public.coupons         disable row level security;

-- ============================================================================
-- Seed: test coupon (PICLES = frete grátis)
-- ============================================================================
insert into public.coupons (code, discount_type, discount_value, free_shipping)
values ('PICLES', 'fixed', 0, true)
on conflict (code) do nothing;

-- ============================================================================
-- Seed: bootstrap admin user
-- After running this file, create an admin via the /api/auth signup flow,
-- then promote with:  update public.users set role='admin' where email='you@example.com';
-- ============================================================================
