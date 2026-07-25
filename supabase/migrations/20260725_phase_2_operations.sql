-- Phase 2: permissões granulares, páginas institucionais, devoluções e base fiscal.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS admin_permissions text[] DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.content_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text NOT NULL,
  excerpt text,
  content text NOT NULL DEFAULT '',
  seo_title text,
  seo_description text,
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'return' CHECK (kind IN ('exchange', 'return', 'refund')),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'reviewing', 'approved', 'rejected', 'received', 'refunded', 'cancelled')),
  reason text NOT NULL,
  customer_notes text,
  admin_notes text,
  amount numeric(12,2) CHECK (amount IS NULL OR amount >= 0),
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  received_at timestamptz,
  refunded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order ON public.return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON public.return_requests(status, requested_at DESC);

CREATE TABLE IF NOT EXISTS public.fiscal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'issued', 'cancelled', 'error')),
  provider text NOT NULL DEFAULT 'manual',
  document_type text NOT NULL DEFAULT 'nfe' CHECK (document_type IN ('nfe', 'nfse', 'receipt')),
  external_id text,
  access_key text,
  document_number text,
  series text,
  xml_url text,
  pdf_url text,
  error_message text,
  issued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_documents_status ON public.fiscal_documents(status, created_at DESC);

ALTER TABLE public.content_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "published pages are public" ON public.content_pages;
CREATE POLICY "published pages are public" ON public.content_pages
  FOR SELECT USING (published = true);

DROP POLICY IF EXISTS "customers read own returns" ON public.return_requests;
CREATE POLICY "customers read own returns" ON public.return_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "customers create own returns" ON public.return_requests;
CREATE POLICY "customers create own returns" ON public.return_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
