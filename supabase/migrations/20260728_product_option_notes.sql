-- Optional customer-facing notes for individual product variations.
ALTER TABLE public.product_options
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
