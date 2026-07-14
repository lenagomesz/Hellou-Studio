-- Observabilidade operacional, histórico de e-mails e monitoramento de serviços.
-- Seguro para executar mais de uma vez.

CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'resend',
  provider_email_id text,
  idempotency_key text NOT NULL UNIQUE,
  email_type text NOT NULL,
  recipient_masked text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'delayed', 'failed', 'bounced', 'complained', 'suppressed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  print_request_id uuid REFERENCES public.print_requests(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  last_error_code text,
  last_error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  last_event_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_delivery_provider_id
  ON public.email_delivery_logs(provider, provider_email_id)
  WHERE provider_email_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_delivery_order
  ON public.email_delivery_logs(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_delivery_status
  ON public.email_delivery_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_delivery_type
  ON public.email_delivery_logs(email_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.email_delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_event_id text NOT NULL UNIQUE,
  email_log_id uuid REFERENCES public.email_delivery_logs(id) ON DELETE CASCADE,
  provider_email_id text NOT NULL,
  event_type text NOT NULL,
  event_created_at timestamptz NOT NULL,
  safe_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_events_log
  ON public.email_delivery_events(email_log_id, event_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_provider
  ON public.email_delivery_events(provider_email_id, event_created_at DESC);

CREATE TABLE IF NOT EXISTS public.operational_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL UNIQUE,
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'error'
    CHECK (severity IN ('warning', 'error', 'critical')),
  title text NOT NULL,
  safe_message text,
  route text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  print_request_id uuid REFERENCES public.print_requests(id) ON DELETE SET NULL,
  occurrence_count integer NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_errors_open
  ON public.operational_errors(severity, last_seen_at DESC)
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_operational_errors_order
  ON public.operational_errors(order_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.service_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL,
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'down', 'unknown')),
  latency_ms integer CHECK (latency_ms IS NULL OR latency_ms >= 0),
  safe_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_health_latest
  ON public.service_health_checks(service, checked_at DESC);

CREATE TABLE IF NOT EXISTS public.cron_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_name text NOT NULL,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'failed')),
  processed_count integer NOT NULL DEFAULT 0 CHECK (processed_count >= 0),
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  safe_error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_latest
  ON public.cron_runs(cron_name, started_at DESC);

DROP TRIGGER IF EXISTS trg_email_delivery_logs_updated_at ON public.email_delivery_logs;
CREATE TRIGGER trg_email_delivery_logs_updated_at
  BEFORE UPDATE ON public.email_delivery_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_operational_errors_updated_at ON public.operational_errors;
CREATE TRIGGER trg_operational_errors_updated_at
  BEFORE UPDATE ON public.operational_errors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.email_delivery_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public.email_delivery_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.operational_errors FROM anon, authenticated;
REVOKE ALL ON TABLE public.service_health_checks FROM anon, authenticated;
REVOKE ALL ON TABLE public.cron_runs FROM anon, authenticated;
