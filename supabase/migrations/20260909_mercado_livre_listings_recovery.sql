create table if not exists mercado_livre_listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  ml_listing_id text not null,
  ml_user_id text not null,
  ml_permalink text not null,
  synced_at timestamp with time zone not null default now(),
  last_updated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  unique(product_id, ml_user_id)
);

create index if not exists mercado_livre_listings_product_id_idx
  on mercado_livre_listings(product_id);

create unique index if not exists mercado_livre_listings_ml_listing_id_idx
  on mercado_livre_listings(ml_listing_id);

alter table mercado_livre_listings enable row level security;

-- The integration accesses this table only through the server-side service role.
revoke all on table mercado_livre_listings from anon, authenticated;
