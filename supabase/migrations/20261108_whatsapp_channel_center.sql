create table if not exists public.whatsapp_channel_schedule (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null unique check (weekday between 0 and 6),
  local_time time not null default '10:00',
  theme text not null check (theme in ('product','poll','gift','behind_scenes','decor','seasonal','promotion')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_channel_posts (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references public.whatsapp_channel_schedule(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  theme text not null check (theme in ('product','poll','gift','behind_scenes','decor','seasonal','promotion')),
  caption text not null,
  image_url text,
  product_name text,
  product_price numeric(10,2),
  product_url text,
  status text not null default 'draft' check (status in ('draft','scheduled','ready','published')),
  scheduled_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, scheduled_at),
  check (status <> 'published' or published_at is not null)
);

create index if not exists whatsapp_channel_posts_status_schedule_idx
  on public.whatsapp_channel_posts(status, scheduled_at);
create index if not exists whatsapp_channel_posts_product_recent_idx
  on public.whatsapp_channel_posts(product_id, created_at desc);

insert into public.whatsapp_channel_schedule (weekday, local_time, theme)
values (0, '10:00', 'seasonal'), (1, '10:00', 'product'), (2, '10:00', 'decor'),
       (3, '10:00', 'poll'), (4, '10:00', 'behind_scenes'), (5, '10:00', 'gift'),
       (6, '10:00', 'seasonal')
on conflict (weekday) do nothing;

update public.whatsapp_channel_schedule set enabled = false where weekday in (0, 2, 4, 6);

alter table public.whatsapp_channel_schedule enable row level security;
alter table public.whatsapp_channel_posts enable row level security;
-- No browser-facing policies: access is only through admin-checked server routes.
