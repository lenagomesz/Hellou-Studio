-- Categorias de produto administráveis pelo painel.

CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  color text NOT NULL DEFAULT '#EC4899' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.product_categories (name, slug, color, sort_order, is_system)
VALUES
  ('Chaveiros', 'chaveiros', '#EC4899', 10, true),
  ('Escritório', 'escritorio', '#F97316', 20, true),
  ('Criaturas', 'criaturas', '#A855F7', 30, true),
  ('Encomenda', 'encomenda', '#64748B', 40, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'category'
      AND udt_name = 'product_category'
  ) THEN
    ALTER TABLE public.products
      ALTER COLUMN category TYPE text USING category::text;
  END IF;
END $$;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_category_fkey;

ALTER TABLE public.products
  ADD CONSTRAINT products_category_fkey
  FOREIGN KEY (category)
  REFERENCES public.product_categories(slug)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_product_categories_active_sort
  ON public.product_categories(active, sort_order, name);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active product categories" ON public.product_categories;
CREATE POLICY "Public can read active product categories"
  ON public.product_categories FOR SELECT
  USING (active = true);
