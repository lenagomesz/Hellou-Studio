-- Clientes com pedidos não podem ser removidos fisicamente porque o histórico
-- financeiro referencia public.users. A exclusão administrativa passa a
-- anonimizar e ocultar essas contas, preservando somente a chave técnica.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS users_active_created_at_idx
  ON public.users(created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
