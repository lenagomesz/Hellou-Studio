ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS customization_sections jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_customization_sections_array_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_customization_sections_array_check
    CHECK (jsonb_typeof(customization_sections) = 'array');

COMMENT ON COLUMN public.products.customization_sections IS
  'Seções combináveis de personalização configuradas pelo administrador.';

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
