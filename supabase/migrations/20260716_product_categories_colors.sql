-- Cores das categorias e normalização do tipo dos produtos físicos.

ALTER TABLE public.product_categories
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#EC4899';

ALTER TABLE public.product_categories
  DROP CONSTRAINT IF EXISTS product_categories_color_check;

ALTER TABLE public.product_categories
  ADD CONSTRAINT product_categories_color_check
  CHECK (color ~ '^#[0-9A-Fa-f]{6}$');

UPDATE public.product_categories SET color = '#EC4899' WHERE slug = 'chaveiros';
UPDATE public.product_categories SET color = '#F97316' WHERE slug = 'escritorio';
UPDATE public.product_categories SET color = '#A855F7' WHERE slug = 'criaturas';
UPDATE public.product_categories SET color = '#64748B' WHERE slug = 'encomenda';

UPDATE public.products
SET type = 'physical'
WHERE type IS NULL;

ALTER TABLE public.products
  ALTER COLUMN type SET DEFAULT 'physical';

