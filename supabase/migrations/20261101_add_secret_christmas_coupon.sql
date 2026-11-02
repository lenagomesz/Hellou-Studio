alter table public.coupons
  add column if not exists first_purchase_only boolean not null default false;

insert into public.coupons (
  code,
  discount_type,
  discount_value,
  min_purchase,
  max_uses,
  free_shipping,
  active,
  first_purchase_only
)
values ('NATALHELLOU5', 'fixed', 5, 0, null, false, true, true)
on conflict (code) do update set
  discount_type = excluded.discount_type,
  discount_value = excluded.discount_value,
  min_purchase = excluded.min_purchase,
  max_uses = excluded.max_uses,
  free_shipping = excluded.free_shipping,
  active = excluded.active,
  first_purchase_only = excluded.first_purchase_only;

-- Bandeja interna do kit religioso: R$ 26 + item religioso mínimo de R$ 19,90.
update public.products
set base_price = 26, sale_price = null, updated_at = now()
where slug = 'monte-seu-kit-religioso';

alter table public.coupons enable row level security;
alter table public.products enable row level security;
