-- Tags administráveis e separação visual entre categorias e tags.

UPDATE public.product_categories
SET color = '#EC4899'
WHERE color IS DISTINCT FROM '#EC4899';

CREATE TABLE IF NOT EXISTS public.product_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#8B5CF6',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_tags
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.product_tags
  DROP CONSTRAINT IF EXISTS product_tags_color_check;

ALTER TABLE public.product_tags
  ADD CONSTRAINT product_tags_color_check
  CHECK (color ~ '^#[0-9A-Fa-f]{6}$');

CREATE TABLE IF NOT EXISTS public.product_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.product_tags(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_product_tag_assignments_product
  ON public.product_tag_assignments(product_id);

CREATE INDEX IF NOT EXISTS idx_product_tag_assignments_tag
  ON public.product_tag_assignments(tag_id);

ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tag_assignments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.product_tags FROM anon, authenticated;
REVOKE ALL ON public.product_tag_assignments FROM anon, authenticated;
