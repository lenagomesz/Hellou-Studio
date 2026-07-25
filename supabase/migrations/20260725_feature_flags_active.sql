CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  category text NOT NULL,
  icon text,
  route text,
  dependencies text[] NOT NULL DEFAULT '{}',
  setup_required boolean NOT NULL DEFAULT false,
  setup_steps jsonb,
  documentation_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

CREATE TABLE IF NOT EXISTS public.feature_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL REFERENCES public.feature_flags(key) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  period text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.feature_flags (key, name, description, enabled, category, route) VALUES
  ('bulk_edit', 'Edição em lote', 'Editar vários produtos de uma vez', true, 'Products', '/dashboard/products/bulk-edit'),
  ('import_csv', 'Importação CSV', 'Importar e exportar o catálogo', true, 'Products', '/dashboard/products/import'),
  ('period_comparison', 'Análises', 'Métricas e comparações da loja', true, 'Analytics', '/dashboard/analytics'),
  ('email_campaigns', 'Campanhas', 'Campanhas e automações de e-mail', true, 'Automation', '/dashboard/campaigns'),
  ('invoicing', 'Documentos fiscais', 'Base manual ou integrada para documentos fiscais', true, 'Orders', '/dashboard/operations')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_usage_stats ENABLE ROW LEVEL SECURITY;
