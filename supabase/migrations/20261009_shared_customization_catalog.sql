-- One identity per physical color. Existing product choices keep their IDs and
-- order history; their catalog references are added without deleting data.
-- Some databases do not have the columns from the earlier preset activation
-- migration yet. Create them before the backfill and checkout guard use them.
ALTER TABLE public.product_option_color_preset_items
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.product_options
  ADD COLUMN IF NOT EXISTS color_preset_item_id uuid
  REFERENCES public.product_option_color_preset_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_product_options_color_preset_item
  ON public.product_options(color_preset_item_id);

CREATE TABLE IF NOT EXISTS public.catalog_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  hex text NOT NULL UNIQUE CHECK (hex ~ '^#[0-9A-F]{6}$'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.catalog_colors (name, hex)
SELECT DISTINCT ON (upper(i.hex)) i.name, upper(i.hex)
FROM public.product_option_color_preset_items i
ORDER BY upper(i.hex), i.created_at, i.id
ON CONFLICT (hex) DO NOTHING;

INSERT INTO public.catalog_colors (name, hex)
SELECT DISTINCT ON (upper(o.color)) coalesce(nullif(btrim(o.color_name), ''), upper(o.color)), upper(o.color)
FROM public.product_options o
WHERE o.color ~* '^#[0-9a-f]{6}$'
ORDER BY upper(o.color), o.created_at, o.id
ON CONFLICT (hex) DO NOTHING;

INSERT INTO public.catalog_colors (name, hex)
SELECT DISTINCT ON (upper(color->>'value'))
  coalesce(nullif(btrim(color->>'label'), ''), upper(color->>'value')),
  upper(color->>'value')
FROM public.products p
CROSS JOIN LATERAL jsonb_array_elements(p.customization_sections) section
CROSS JOIN LATERAL jsonb_array_elements(coalesce(section->'colors', '[]'::jsonb)) color
WHERE color->>'value' ~* '^#[0-9a-f]{6}$'
ORDER BY upper(color->>'value'), p.id
ON CONFLICT (hex) DO NOTHING;

ALTER TABLE public.product_option_color_preset_items
  ADD COLUMN IF NOT EXISTS catalog_color_id uuid REFERENCES public.catalog_colors(id) ON DELETE RESTRICT;
ALTER TABLE public.product_options
  ADD COLUMN IF NOT EXISTS catalog_color_id uuid REFERENCES public.catalog_colors(id) ON DELETE RESTRICT;

UPDATE public.product_option_color_preset_items i
SET catalog_color_id = c.id
FROM public.catalog_colors c
WHERE upper(i.hex) = c.hex AND i.catalog_color_id IS NULL;

UPDATE public.product_options o
SET catalog_color_id = c.id
FROM public.catalog_colors c
WHERE upper(o.color) = c.hex AND o.catalog_color_id IS NULL;

UPDATE public.product_options o
SET catalog_color_id = i.catalog_color_id
FROM public.product_option_color_preset_items i
WHERE o.color_preset_item_id = i.id AND o.catalog_color_id IS NULL;

UPDATE public.product_options o
SET catalog_color_id = c.id
FROM public.catalog_colors c
WHERE o.catalog_color_id IS NULL
  AND (lower(btrim(o.color)) = lower(c.name) OR lower(btrim(o.color_name)) = lower(c.name));

CREATE INDEX IF NOT EXISTS idx_product_options_catalog_color ON public.product_options(catalog_color_id);

-- Preserve each product's exclusive sections, adding references to canonical
-- colors inside the existing JSON. No historical order or selection is changed.
UPDATE public.products p
SET customization_sections = (
  SELECT jsonb_agg(
    CASE WHEN section ? 'colors' THEN jsonb_set(section, '{colors}',
      coalesce((SELECT jsonb_agg(
        CASE WHEN c.id IS NULL THEN color ELSE color || jsonb_build_object('colorId', c.id) END
        ORDER BY color_ordinal
      )
      FROM jsonb_array_elements(coalesce(section->'colors', '[]'::jsonb)) WITH ORDINALITY AS colors(color, color_ordinal)
      LEFT JOIN public.catalog_colors c ON c.hex = upper(color->>'value')), '[]'::jsonb))
    ELSE section END ORDER BY section_ordinal)
  FROM jsonb_array_elements(p.customization_sections) WITH ORDINALITY AS sections(section, section_ordinal)
)
WHERE jsonb_array_length(p.customization_sections) > 0;

CREATE TABLE IF NOT EXISTS public.customization_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '',
  definition jsonb NOT NULL CHECK (jsonb_typeof(definition) = 'object'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_customization_steps (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.customization_steps(id) ON DELETE RESTRICT,
  sort_order integer NOT NULL DEFAULT 100,
  required boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  blocked_ids text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (product_id, step_id)
);
CREATE INDEX IF NOT EXISTS idx_product_customization_steps_step ON public.product_customization_steps(step_id);

ALTER TABLE public.catalog_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customization_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_customization_steps ENABLE ROW LEVEL SECURITY;

-- The payment route checks customization selections. This guard also checks
-- commercial color availability inside the checkout transaction, closing the
-- window between the route's read and the order item insert.
CREATE OR REPLACE FUNCTION public.assert_checkout_option_available()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_checkout_state text;
  v_option record;
BEGIN
  SELECT checkout_state INTO v_checkout_state FROM public.orders WHERE id = NEW.order_id;
  IF v_checkout_state IS DISTINCT FROM 'prepared' THEN
    RETURN NEW;
  END IF;
  IF NEW.product_option_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.product_options WHERE product_id = NEW.product_id) THEN
      RAISE EXCEPTION 'Selecione uma variação disponível para o produto.';
    END IF;
    RETURN NEW;
  END IF;

  SELECT o.active, o.product_id, o.color_preset_item_id,
    coalesce(o.catalog_color_id, i.catalog_color_id) AS catalog_color_id,
    i.active AS preset_active
  INTO v_option
  FROM public.product_options o
  LEFT JOIN public.product_option_color_preset_items i ON i.id = o.color_preset_item_id
  WHERE o.id = NEW.product_option_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A variação selecionada não está mais disponível.';
  END IF;
  IF NOT v_option.active OR v_option.product_id IS DISTINCT FROM NEW.product_id
     OR (v_option.color_preset_item_id IS NOT NULL AND v_option.preset_active IS DISTINCT FROM true)
     OR EXISTS (SELECT 1 FROM public.catalog_colors c WHERE c.id = v_option.catalog_color_id AND NOT c.active)
  THEN
    RAISE EXCEPTION 'A variação selecionada não está mais disponível.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assert_checkout_option_available ON public.order_items;
CREATE TRIGGER trg_assert_checkout_option_available
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.assert_checkout_option_available();
