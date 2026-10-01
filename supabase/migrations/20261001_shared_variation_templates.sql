-- Shared variation metadata. Product options remain product-specific so stock,
-- prices, images and order history never leak from one product to another.
ALTER TABLE public.product_option_color_presets
  ADD COLUMN IF NOT EXISTS customer_label text NOT NULL DEFAULT 'Escolha uma cor'
    CHECK (char_length(btrim(customer_label)) BETWEEN 1 AND 60);

ALTER TABLE public.product_options
  ADD COLUMN IF NOT EXISTS variation_label text NULL
    CHECK (variation_label IS NULL OR char_length(btrim(variation_label)) BETWEEN 1 AND 60);

-- Existing color sets keep the familiar title until an administrator changes it.
UPDATE public.product_option_color_presets
SET customer_label = 'Escolha uma cor'
WHERE customer_label IS NULL OR btrim(customer_label) = '';

-- Reaffirm the existing protection after changing both shared tables.
ALTER TABLE public.product_option_color_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
