-- Segurança: tokens de reset passam a armazenar somente SHA-256 e rate limits
-- são compartilhados entre todas as instâncias serverless.

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tokens antigos estavam em texto puro e não devem continuar válidos.
TRUNCATE TABLE public.password_reset_tokens;

ALTER TABLE public.password_reset_tokens
  DROP CONSTRAINT IF EXISTS password_reset_tokens_token_hash_check;
ALTER TABLE public.password_reset_tokens
  ADD CONSTRAINT password_reset_tokens_token_hash_check
  CHECK (token ~ '^[a-f0-9]{64}$');

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token
  ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
  ON public.password_reset_tokens(expires_at);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.password_reset_tokens FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  key_hash text PRIMARY KEY CHECK (key_hash ~ '^[a-f0-9]{64}$'),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  reset_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.api_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_key_hash text,
  p_max_requests integer,
  p_window_seconds integer
)
RETURNS TABLE(allowed boolean, remaining integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_record public.api_rate_limits%ROWTYPE;
BEGIN
  IF p_key_hash !~ '^[a-f0-9]{64}$'
     OR p_max_requests < 1
     OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid rate limit parameters';
  END IF;

  INSERT INTO public.api_rate_limits AS limits (
    key_hash,
    request_count,
    reset_at,
    updated_at
  )
  VALUES (
    p_key_hash,
    1,
    now() + make_interval(secs => p_window_seconds),
    now()
  )
  ON CONFLICT (key_hash) DO UPDATE
  SET
    request_count = CASE
      WHEN limits.reset_at <= now() THEN 1
      ELSE limits.request_count + 1
    END,
    reset_at = CASE
      WHEN limits.reset_at <= now() THEN now() + make_interval(secs => p_window_seconds)
      ELSE limits.reset_at
    END,
    updated_at = now()
  RETURNING * INTO current_record;

  RETURN QUERY SELECT
    current_record.request_count <= p_max_requests,
    GREATEST(0, p_max_requests - current_record.request_count),
    current_record.reset_at;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(text, integer, integer)
  TO service_role;

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_reset_at
  ON public.api_rate_limits(reset_at);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.change_password_after_reset(p_user_id uuid, p_password_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET password_hash = p_password_hash,
      session_version = session_version + 1,
      updated_at = now()
  WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.change_password_after_reset(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_password_after_reset(uuid, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.revoke_user_sessions(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.users
  SET session_version = session_version + 1
  WHERE id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.revoke_user_sessions(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_user_sessions(uuid)
  TO service_role;
