-- ============================================================================
-- Inventory Management System Migration
-- Tables: stock_movements, warehouses, warehouse_stock, suppliers,
--         product_suppliers, reorder_tasks
-- Fields: reorder_point, standard_order_qty on product_options
-- ============================================================================

-- ============================================================================
-- ENUM: stock movement reasons
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE stock_movement_reason AS ENUM (
    'venda', 'devolucao', 'ajuste_manual', 'reposicao', 'quebra', 'perda', 'transferencia'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- ENUM: reorder task status
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE reorder_task_status AS ENUM (
    'pending', 'ordered', 'in_transit', 'received', 'canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Add reorder_point and standard_order_qty to product_options
-- ============================================================================
ALTER TABLE public.product_options
  ADD COLUMN IF NOT EXISTS reorder_point integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS standard_order_qty integer NOT NULL DEFAULT 50;

-- ============================================================================
-- Stock Movements Log
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_option_id uuid REFERENCES public.product_options(id) ON DELETE SET NULL,
  warehouse_id    uuid,  -- nullable, references warehouses once created
  quantity_change integer NOT NULL,  -- positive = stock in, negative = stock out
  stock_before    integer NOT NULL,
  stock_after     integer NOT NULL,
  reason          stock_movement_reason NOT NULL,
  notes           text,
  user_id         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reference_id    text,  -- order_id, transfer_id, etc.
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Warehouses (multi-warehouse ready)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.warehouses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  address     text,
  city        text,
  state       text,
  zip_code    text,
  is_default  boolean NOT NULL DEFAULT false,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Warehouse Stock (stock per warehouse per product_option)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.warehouse_stock (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id        uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_option_id   uuid NOT NULL REFERENCES public.product_options(id) ON DELETE CASCADE,
  quantity            integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  last_counted_at     timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, product_option_id)
);

-- ============================================================================
-- Suppliers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  contact_name      text,
  email             text,
  phone             text,
  website           text,
  address           text,
  lead_time_days    integer NOT NULL DEFAULT 7,
  reliability_score numeric(3,2) DEFAULT 1.00 CHECK (reliability_score >= 0 AND reliability_score <= 1),
  notes             text,
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Product Suppliers (which supplier provides which product, at what cost)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_suppliers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id     uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  cost_per_unit   numeric(10,2) NOT NULL DEFAULT 0 CHECK (cost_per_unit >= 0),
  min_order_qty   integer NOT NULL DEFAULT 1,
  sku             text,
  is_preferred    boolean NOT NULL DEFAULT false,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, supplier_id)
);

-- ============================================================================
-- Reorder Tasks (track reorder workflow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reorder_tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_option_id   uuid REFERENCES public.product_options(id) ON DELETE SET NULL,
  supplier_id         uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  status              reorder_task_status NOT NULL DEFAULT 'pending',
  quantity_ordered    integer NOT NULL,
  quantity_received   integer NOT NULL DEFAULT 0,
  estimated_arrival   timestamptz,
  actual_arrival      timestamptz,
  cost_total          numeric(10,2),
  notes               text,
  created_by          uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_option ON public.stock_movements(product_option_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reason ON public.stock_movements(reason);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON public.stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse ON public.warehouse_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_option ON public.warehouse_stock(product_option_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_product ON public.product_suppliers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier ON public.product_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_reorder_tasks_product ON public.reorder_tasks(product_id);
CREATE INDEX IF NOT EXISTS idx_reorder_tasks_status ON public.reorder_tasks(status);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS trg_warehouses_updated_at ON public.warehouses;
CREATE TRIGGER trg_warehouses_updated_at
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_warehouse_stock_updated_at ON public.warehouse_stock;
CREATE TRIGGER trg_warehouse_stock_updated_at
  BEFORE UPDATE ON public.warehouse_stock
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_reorder_tasks_updated_at ON public.reorder_tasks;
CREATE TRIGGER trg_reorder_tasks_updated_at
  BEFORE UPDATE ON public.reorder_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- RLS (disabled - API layer handles auth)
-- ============================================================================
ALTER TABLE public.stock_movements    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_stock    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_suppliers  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reorder_tasks      DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Seed: Default warehouse
-- ============================================================================
INSERT INTO public.warehouses (name, is_default)
VALUES ('Estoque Principal', true)
ON CONFLICT DO NOTHING;
