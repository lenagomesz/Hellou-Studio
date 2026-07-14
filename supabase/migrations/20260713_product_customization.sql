alter table public.products
  add column if not exists is_customizable boolean not null default false;

alter table public.cart_items
  add column if not exists customization_text text;

alter table public.order_items
  add column if not exists customization_text text;

comment on column public.products.is_customizable is
  'Quando verdadeiro, exige que o cliente informe a personalização antes de adicionar ao carrinho.';

comment on column public.cart_items.customization_text is
  'Texto de personalização informado pelo cliente para este item.';

comment on column public.order_items.customization_text is
  'Cópia permanente da personalização informada no momento da compra.';
