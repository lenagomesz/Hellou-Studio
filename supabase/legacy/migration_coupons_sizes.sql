-- LEGADO: migracao manual preservada apenas para referencia.
-- ============================================================================
-- Migration: Cupons com frete grátis + seed PICLES
-- Rodar no Supabase SQL Editor (Project → SQL Editor → New query → paste → Run)
-- ============================================================================

-- 1. Criar tabela de cupons (se não existe)
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

-- 2. Se a tabela já existia, adicionar coluna free_shipping
alter table public.coupons add column if not exists free_shipping boolean not null default false;

-- 3. RLS desabilitado (acesso via service-role key no Next.js)
alter table public.coupons disable row level security;

-- 4. Cupom de teste: PICLES = frete grátis
insert into public.coupons (code, discount_type, discount_value, free_shipping)
values ('PICLES', 'fixed', 0, true)
on conflict (code) do update set free_shipping = true, active = true;

-- ============================================================================
-- 5. Coluna de dimensões nas opções de produto
-- ============================================================================
alter table public.product_options add column if not exists dimensions text;

-- Preencher dimensões padrão para tamanhos existentes
update public.product_options set dimensions = '5x5x3 cm' where upper(name) = 'P' and dimensions is null;
update public.product_options set dimensions = '8x8x5 cm' where upper(name) = 'M' and dimensions is null;
update public.product_options set dimensions = '12x12x7 cm' where upper(name) = 'G' and dimensions is null;

-- ============================================================================
-- 6. Tamanhos P / M / G para todos os produtos que ainda não têm
-- ============================================================================
insert into public.product_options (product_id, name, price_modifier, stock)
select p.id, s.name, 0, 10
from public.products p
cross join (values ('P'), ('M'), ('G')) as s(name)
where not exists (
  select 1 from public.product_options po
  where po.product_id = p.id and upper(po.name) = s.name
);

-- ============================================================================
-- Verificar: rodar após a migration
-- ============================================================================
-- select * from public.coupons;
-- select p.name as produto, po.name as tamanho, po.stock
--   from public.product_options po
--   join public.products p on p.id = po.product_id
--   order by p.name, po.name;
