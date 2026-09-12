create table if not exists public.product_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint product_favorites_user_product_unique unique (user_id, product_id)
);

create index if not exists product_favorites_user_created_idx
  on public.product_favorites (user_id, created_at desc);

alter table public.product_favorites enable row level security;
revoke all privileges on table public.product_favorites from anon, authenticated;
