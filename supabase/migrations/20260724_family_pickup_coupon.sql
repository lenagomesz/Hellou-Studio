-- Alinha o banco ao valor usado pela aplicação e garante a opção de retirada.
-- Seguro para executar mais de uma vez.

ALTER TABLE public.coupons
  DROP CONSTRAINT IF EXISTS coupons_discount_type_check;

UPDATE public.coupons
SET discount_type = 'percent'
WHERE discount_type = 'percentage';

ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_discount_type_check
  CHECK (discount_type IN ('fixed', 'percent'));

INSERT INTO public.coupons (
  code,
  discount_type,
  discount_value,
  min_purchase,
  free_shipping,
  active
)
VALUES (
  'RETIRADAHELENA',
  'fixed',
  0,
  0,
  true,
  true
)
ON CONFLICT (code) DO UPDATE
SET
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  min_purchase = EXCLUDED.min_purchase,
  free_shipping = EXCLUDED.free_shipping,
  active = EXCLUDED.active;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
