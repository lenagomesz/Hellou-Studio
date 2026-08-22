-- Create table to track Mercado Livre listings
create table if not exists mercado_livre_listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  ml_listing_id text not null,
  ml_user_id text not null,
  ml_permalink text not null,
  synced_at timestamp with time zone default now(),
  last_updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),

  unique(product_id, ml_user_id)
);

create index if not exists mercado_livre_listings_product_id on mercado_livre_listings(product_id);
create index if not exists mercado_livre_listings_ml_listing_id on mercado_livre_listings(ml_listing_id);

-- Enable RLS
alter table mercado_livre_listings enable row level security;

-- Allow authenticated users to read listings
create policy "Allow read mercado_livre_listings" on mercado_livre_listings
  for select
  using (true);

-- Allow authenticated admins to insert/update/delete
create policy "Allow admin mercado_livre_listings" on mercado_livre_listings
  for all
  using (auth.jwt_check_claim('role', 'authenticated'));
