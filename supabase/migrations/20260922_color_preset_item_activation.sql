-- Keep colors in the reusable set and link each product variation to its source color.
ALTER TABLE public.product_option_color_preset_items
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

ALTER TABLE public.product_options
  ADD COLUMN IF NOT EXISTS color_preset_item_id uuid
  REFERENCES public.product_option_color_preset_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_options_color_preset_item
  ON public.product_options(color_preset_item_id);

ALTER TABLE public.product_option_color_preset_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
