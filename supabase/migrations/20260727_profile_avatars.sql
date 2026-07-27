ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_avatar_url_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_avatar_url_check
  CHECK (
    avatar_url IS NULL
    OR avatar_url = 'uploaded'
    OR avatar_url ~ '^/images/avatars/axolotl-0[1-6]\.png$'
  );

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
