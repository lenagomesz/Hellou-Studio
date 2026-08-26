-- Keep the customer-facing color label separate from the variation/size name.
ALTER TABLE public.product_options
  ADD COLUMN IF NOT EXISTS color_name text;

ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
