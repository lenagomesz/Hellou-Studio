BEGIN;

ALTER TABLE public.order_ratings
  ADD COLUMN IF NOT EXISTS comment text;

COMMENT ON COLUMN public.order_ratings.comment IS
  'Comentário opcional deixado pelo cliente sobre a experiência do pedido.';

NOTIFY pgrst, 'reload schema';

COMMIT;
