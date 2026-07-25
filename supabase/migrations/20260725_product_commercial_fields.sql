-- Dados profissionais de catálogo, logística, custo e SEO.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS cost_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS weight_grams integer,
  ADD COLUMN IF NOT EXISTS length_cm numeric(10,2),
  ADD COLUMN IF NOT EXISTS width_cm numeric(10,2),
  ADD COLUMN IF NOT EXISTS height_cm numeric(10,2),
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS slug text;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_cost_price_check,
  DROP CONSTRAINT IF EXISTS products_weight_grams_check,
  DROP CONSTRAINT IF EXISTS products_length_cm_check,
  DROP CONSTRAINT IF EXISTS products_width_cm_check,
  DROP CONSTRAINT IF EXISTS products_height_cm_check,
  DROP CONSTRAINT IF EXISTS products_sku_format_check,
  DROP CONSTRAINT IF EXISTS products_slug_format_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_cost_price_check CHECK (cost_price IS NULL OR cost_price >= 0),
  ADD CONSTRAINT products_weight_grams_check CHECK (weight_grams IS NULL OR weight_grams > 0),
  ADD CONSTRAINT products_length_cm_check CHECK (length_cm IS NULL OR length_cm > 0),
  ADD CONSTRAINT products_width_cm_check CHECK (width_cm IS NULL OR width_cm > 0),
  ADD CONSTRAINT products_height_cm_check CHECK (height_cm IS NULL OR height_cm > 0),
  ADD CONSTRAINT products_sku_format_check CHECK (sku IS NULL OR sku ~ '^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$'),
  ADD CONSTRAINT products_slug_format_check CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique
  ON public.products (lower(sku))
  WHERE sku IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique
  ON public.products (slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_active_slug_idx
  ON public.products (active, slug);

