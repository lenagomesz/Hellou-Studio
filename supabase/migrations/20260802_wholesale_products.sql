-- Produtos marcados para venda em quantidade a lojistas, sem alterar sua categoria normal.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_wholesale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS minimum_order_quantity integer NOT NULL DEFAULT 1;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_minimum_order_quantity_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_minimum_order_quantity_check
  CHECK (
    (is_wholesale = false AND minimum_order_quantity = 1)
    OR (is_wholesale = true AND minimum_order_quantity BETWEEN 2 AND 999)
  );

CREATE INDEX IF NOT EXISTS products_active_wholesale_idx
  ON public.products (active, is_wholesale)
  WHERE is_wholesale = true;

COMMENT ON COLUMN public.products.is_wholesale IS 'Exibe o produto também na área Para lojistas.';
COMMENT ON COLUMN public.products.minimum_order_quantity IS 'Quantidade mínima obrigatória no pedido deste produto.';

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
