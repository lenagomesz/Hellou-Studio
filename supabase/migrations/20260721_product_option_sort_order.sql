-- Persist the storefront display order of product variations/colors.
ALTER TABLE public.product_options
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

WITH ranked_options AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (
      PARTITION BY product_id
      ORDER BY created_at ASC, id ASC
    ) - 1)::integer * 10 AS next_sort_order
  FROM public.product_options
)
UPDATE public.product_options AS product_option
SET sort_order = ranked_options.next_sort_order
FROM ranked_options
WHERE product_option.id = ranked_options.id;

CREATE INDEX IF NOT EXISTS idx_product_options_sort_order
  ON public.product_options(product_id, sort_order, created_at);
