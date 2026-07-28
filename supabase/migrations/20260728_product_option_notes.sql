-- Optional customer-facing notes for individual product variations.
ALTER TABLE public.product_options
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
