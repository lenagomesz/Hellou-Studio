-- LEGADO: migracao manual de CPF e Mercado Pago.
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'awaiting_payment' BEFORE 'pending';

-- Add CPF to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cpf text;

-- Add Mercado Pago columns to orders (keep Stripe columns intact)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mp_payment_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mp_payment_method text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mp_status text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_provider text DEFAULT 'stripe';

-- Index for Mercado Pago payment lookup
CREATE INDEX IF NOT EXISTS idx_orders_mp_payment_id ON public.orders(mp_payment_id) WHERE mp_payment_id IS NOT NULL;
