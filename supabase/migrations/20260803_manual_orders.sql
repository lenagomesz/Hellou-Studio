-- Encomendas registradas manualmente pela equipe (vendas presenciais/fora do site).
CREATE TABLE IF NOT EXISTS public.manual_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  title text NOT NULL,
  description text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total numeric(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_production', 'ready', 'delivered', 'canceled')),
  internal_notes text,
  invite_sent_at timestamptz,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS manual_orders_user_idx ON public.manual_orders(user_id);
CREATE INDEX IF NOT EXISTS manual_orders_email_idx ON public.manual_orders(lower(customer_email));
CREATE INDEX IF NOT EXISTS manual_orders_status_idx ON public.manual_orders(status, payment_status, created_at DESC);

DROP TRIGGER IF EXISTS trg_manual_orders_updated_at ON public.manual_orders;
CREATE TRIGGER trg_manual_orders_updated_at
  BEFORE UPDATE ON public.manual_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.manual_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.manual_orders FROM anon, authenticated;

COMMENT ON TABLE public.manual_orders IS 'Encomendas feitas fora do checkout e controladas manualmente pela equipe.';
COMMENT ON COLUMN public.manual_orders.user_id IS 'Conta vinculada; pode ser preenchida automaticamente quando o convidado se cadastrar.';
