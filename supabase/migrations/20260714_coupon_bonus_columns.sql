-- Completa os campos de bônus exclusivos sem reaplicar a migração administrativa.
-- Seguro para executar mais de uma vez.

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS exclusive_user_id uuid,
  ADD COLUMN IF NOT EXISTS bonus_title text,
  ADD COLUMN IF NOT EXISTS bonus_description text,
  ADD COLUMN IF NOT EXISTS show_in_bonus_area boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.coupons'::regclass
      AND conname = 'coupons_exclusive_user_id_fkey'
  ) THEN
    ALTER TABLE public.coupons
      ADD CONSTRAINT coupons_exclusive_user_id_fkey
      FOREIGN KEY (exclusive_user_id)
      REFERENCES public.users(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_coupons_exclusive_user
  ON public.coupons(exclusive_user_id)
  WHERE exclusive_user_id IS NOT NULL;
