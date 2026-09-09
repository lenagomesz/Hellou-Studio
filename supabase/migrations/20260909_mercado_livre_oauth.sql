create table if not exists mercado_livre_connections (
  id uuid primary key default gen_random_uuid(),
  admin_user_id text not null unique,
  ml_user_id text not null,
  ml_nickname text,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  expires_at timestamp with time zone not null,
  scope text,
  connected_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists mercado_livre_connections_ml_user_id_idx
  on mercado_livre_connections(ml_user_id);

alter table mercado_livre_connections enable row level security;

-- Tokens are intentionally server-only. Access is made with the service-role client.
revoke all on table mercado_livre_connections from anon, authenticated;
