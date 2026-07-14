-- LEGADO: notificacoes e avaliacoes, preservado para referencia.
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  type       text not null check (type in ('order_status', 'print_request_status', 'announcement')),
  title      text not null,
  body       text,
  read       boolean not null default false,
  metadata   jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_unread on public.notifications(user_id) where read = false;
alter table public.notifications disable row level security;

-- Reviews
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  rating     integer not null check (rating >= 1 and rating <= 5),
  comment    text,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);
create index if not exists idx_reviews_product on public.reviews(product_id);
alter table public.reviews disable row level security;

-- Banned emails
create table if not exists public.banned_emails (
  id        uuid primary key default gen_random_uuid(),
  email     text not null unique,
  reason    text,
  banned_at timestamptz not null default now(),
  banned_by uuid references public.users(id) on delete set null
);
alter table public.banned_emails disable row level security;
