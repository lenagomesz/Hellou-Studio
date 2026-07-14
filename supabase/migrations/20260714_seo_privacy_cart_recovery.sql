-- SEO não exige alteração de banco. Esta migration registra consentimentos e torna
-- a recuperação de carrinho auditável e idempotente. Seguro para executar novamente.

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.cart_items
SET updated_at = created_at
WHERE updated_at IS NULL OR updated_at < created_at;

DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_cart_items_abandoned
  ON public.cart_items(updated_at, user_id);

CREATE TABLE IF NOT EXISTS public.privacy_consent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  consent_version text NOT NULL,
  analytics boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'cookie_banner',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_privacy_consent_user_created
  ON public.privacy_consent_logs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.cart_recovery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  automation_id uuid REFERENCES public.email_automations(id) ON DELETE SET NULL,
  cart_signature text NOT NULL,
  recovery_stage smallint NOT NULL DEFAULT 1 CHECK (recovery_stage BETWEEN 1 AND 3),
  item_count integer NOT NULL CHECK (item_count > 0),
  cart_total numeric(10,2) NOT NULL CHECK (cart_total >= 0),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'converted')),
  sent_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cart_signature, recovery_stage)
);

CREATE INDEX IF NOT EXISTS idx_cart_recovery_user_created
  ON public.cart_recovery_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_recovery_status
  ON public.cart_recovery_events(status, created_at DESC);

DO $$
BEGIN
  IF to_regclass('public.email_automations') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.email_automations WHERE trigger_type = 'cart_abandoned'
    ) THEN
    INSERT INTO public.email_automations (
      name, trigger_type, trigger_conditions, subject, body_html, delay_minutes, enabled
    ) VALUES (
      'Recuperação de carrinho',
      'cart_abandoned',
      '{"max_age_days": 7}'::jsonb,
      '{customer_name}, seu carrinho ainda está esperando por você',
      NULL,
      120,
      true
    );
  END IF;
END;
$$;

ALTER TABLE public.privacy_consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_recovery_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.privacy_consent_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public.cart_recovery_events FROM anon, authenticated;
