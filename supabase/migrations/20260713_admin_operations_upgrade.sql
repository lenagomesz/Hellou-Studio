-- Hellou Studio: production materials, made-to-order products, customer bonuses
-- and richer order feedback. Safe to run more than once.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS fulfillment_mode text NOT NULL DEFAULT 'made_to_order'
    CHECK (fulfillment_mode IN ('made_to_order', 'ready_stock', 'hybrid'));

ALTER TABLE public.product_options
  ADD COLUMN IF NOT EXISTS ready_stock integer NOT NULL DEFAULT 0 CHECK (ready_stock >= 0),
  ADD COLUMN IF NOT EXISTS production_lead_days integer NOT NULL DEFAULT 3 CHECK (production_lead_days >= 0);

CREATE TABLE IF NOT EXISTS public.inventory_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  material_type text NOT NULL DEFAULT 'PLA',
  brand text,
  color_name text NOT NULL,
  color_hex text NOT NULL DEFAULT '#A1A1AA',
  spool_weight_grams integer NOT NULL DEFAULT 1000 CHECK (spool_weight_grams > 0),
  current_weight_grams integer NOT NULL DEFAULT 0 CHECK (current_weight_grams >= 0),
  reserved_weight_grams integer NOT NULL DEFAULT 0 CHECK (reserved_weight_grams >= 0),
  reorder_point_grams integer NOT NULL DEFAULT 250 CHECK (reorder_point_grams >= 0),
  target_weight_grams integer NOT NULL DEFAULT 1000 CHECK (target_weight_grams >= 0),
  cost_per_kg numeric(10,2) NOT NULL DEFAULT 0 CHECK (cost_per_kg >= 0),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_material_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_option_id uuid REFERENCES public.product_options(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.inventory_materials(id) ON DELETE CASCADE,
  grams_per_unit integer NOT NULL CHECK (grams_per_unit > 0),
  waste_percent numeric(5,2) NOT NULL DEFAULT 8 CHECK (waste_percent >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, product_option_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_materials_priority ON public.inventory_materials(priority, active);
CREATE INDEX IF NOT EXISTS idx_product_material_requirements_product ON public.product_material_requirements(product_id);
CREATE INDEX IF NOT EXISTS idx_product_material_requirements_material ON public.product_material_requirements(material_id);

DROP TRIGGER IF EXISTS trg_inventory_materials_updated_at ON public.inventory_materials;
CREATE TRIGGER trg_inventory_materials_updated_at
  BEFORE UPDATE ON public.inventory_materials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.inventory_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_material_requirements DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.order_ratings
  ADD COLUMN IF NOT EXISTS comment text;

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS exclusive_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS bonus_title text,
  ADD COLUMN IF NOT EXISTS bonus_description text,
  ADD COLUMN IF NOT EXISTS show_in_bonus_area boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_coupons_exclusive_user ON public.coupons(exclusive_user_id)
  WHERE exclusive_user_id IS NOT NULL;

ALTER TABLE public.admin_notifications
  ADD COLUMN IF NOT EXISTS related_print_request_id uuid REFERENCES public.print_requests(id) ON DELETE CASCADE;
