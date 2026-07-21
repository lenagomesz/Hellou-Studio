-- Tráfego anônimo consentido da loja, sem armazenamento de IP ou user-agent bruto.
-- Seguro para executar mais de uma vez.

CREATE TABLE IF NOT EXISTS public.site_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_hash text NOT NULL,
  session_hash text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('session_start', 'page_view')),
  path text NOT NULL,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text NOT NULL DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'other')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_analytics_created
  ON public.site_analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_analytics_visitor_created
  ON public.site_analytics_events(visitor_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_analytics_session_created
  ON public.site_analytics_events(session_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_analytics_path_created
  ON public.site_analytics_events(path, created_at DESC);

ALTER TABLE public.site_analytics_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.site_analytics_events IS 'Anonymous navigation events collected only after analytics consent. No raw IP or user-agent is stored.';
