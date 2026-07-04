-- Add product type and file_path for STL marketplace (digital products)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'physical';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS file_path text;

-- Add shipped_at to orders for tracking shipment/completion timestamps
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at timestamptz;
