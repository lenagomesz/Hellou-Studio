-- Hellou Studio: perfis administrativos, atividade de clientes e custos de estoque.
-- Seguro para executar mais de uma vez.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS admin_access_level text,
  ADD COLUMN IF NOT EXISTS admin_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_admin_access_level_check;
ALTER TABLE public.users ADD CONSTRAINT users_admin_access_level_check
  CHECK (admin_access_level IS NULL OR admin_access_level IN ('owner', 'partner'));

UPDATE public.users
SET admin_access_level = 'owner'
WHERE role = 'admin' AND admin_access_level IS NULL;

-- Função compartilhada pelos gatilhos de atualização. É criada aqui para que
-- esta migration não dependa da execução de arquivos anteriores.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.user_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('login', 'session_start', 'page_view', 'product_view', 'cart', 'checkout', 'order', 'print_request')),
  path text,
  entity_type text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_created
  ON public.user_activity_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_created
  ON public.user_activity_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_type_created
  ON public.user_activity_events(event_type, created_at DESC);

-- Garante o controle de materiais mesmo que a migration operacional anterior
-- ainda não tenha sido executada neste projeto.
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

CREATE INDEX IF NOT EXISTS idx_inventory_materials_priority
  ON public.inventory_materials(priority, active);

DROP TRIGGER IF EXISTS trg_inventory_materials_updated_at ON public.inventory_materials;
CREATE TRIGGER trg_inventory_materials_updated_at
  BEFORE UPDATE ON public.inventory_materials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.inventory_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('filament', 'packaging', 'maintenance', 'tool', 'shipping', 'energy', 'other')),
  description text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  quantity numeric(12,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  supplier_name text,
  material_id uuid REFERENCES public.inventory_materials(id) ON DELETE SET NULL,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'canceled')),
  notes text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_expenses_purchase_date
  ON public.inventory_expenses(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_expenses_category
  ON public.inventory_expenses(category, purchase_date DESC);

DROP TRIGGER IF EXISTS trg_inventory_expenses_updated_at ON public.inventory_expenses;
CREATE TRIGGER trg_inventory_expenses_updated_at
  BEFORE UPDATE ON public.inventory_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Toda leitura e gravação ocorre pelas rotas autenticadas do servidor.
ALTER TABLE public.user_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_expenses ENABLE ROW LEVEL SECURITY;
