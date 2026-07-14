-- LEGADO: primeira versao de solicitacoes de impressao.
-- ============================================================================
-- Migration: Print Requests (impressão customizada via STL)
-- Rodar no Supabase SQL Editor (Project → SQL Editor → New query → paste → Run)
-- Também criar o bucket "stl-uploads" no Supabase Storage (público: false)
-- ============================================================================

-- 1. Enum de status
do $$ begin
  create type print_request_status as enum (
    'pending','quoted','approved','paid','in_production','shipped','delivered','rejected','canceled'
  );
exception when duplicate_object then null; end $$;

-- 2. Tabela de solicitações
create table if not exists public.print_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  title          text not null,
  description    text,
  notes          text,
  stl_file_url   text not null,
  stl_file_name  text not null,
  stl_file_size  bigint not null,
  status         print_request_status not null default 'pending',
  admin_notes    text,
  quoted_price   numeric(10,2),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 3. Indexes
create index if not exists idx_print_requests_user   on public.print_requests(user_id);
create index if not exists idx_print_requests_status on public.print_requests(status);

-- 4. updated_at trigger
drop trigger if exists trg_print_requests_updated_at on public.print_requests;
create trigger trg_print_requests_updated_at
  before update on public.print_requests
  for each row execute function public.set_updated_at();

-- 5. RLS desabilitado (acesso via service-role key)
alter table public.print_requests disable row level security;

-- ============================================================================
-- Verificar após rodar:
-- select * from public.print_requests;
-- ============================================================================
