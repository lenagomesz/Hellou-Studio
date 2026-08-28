-- Run AFTER 20260828_product_ai_seo.sql. No product or SEO content is changed.
begin;

create table if not exists public.ai_quota_pauses (
  model text primary key,
  kind text not null check (kind in ('daily', 'rate')),
  retry_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.ai_quota_pauses enable row level security;
revoke all on public.ai_quota_pauses from public, anon, authenticated;
grant all on public.ai_quota_pauses to service_role;

create or replace function public.pause_gemini_quota(p_model text, p_kind text, p_retry_at timestamptz)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_kind not in ('daily', 'rate') or length(p_model) > 100 or p_retry_at > now() + interval '26 hours' then
    raise exception 'Invalid quota pause';
  end if;
  insert into public.ai_quota_pauses(model, kind, retry_at) values (p_model, p_kind, p_retry_at)
  on conflict (model) do update set
    kind = case when excluded.retry_at > ai_quota_pauses.retry_at then excluded.kind else ai_quota_pauses.kind end,
    retry_at = greatest(ai_quota_pauses.retry_at, excluded.retry_at), updated_at = now();
end $$;

-- Return the attempt spent on quota failure, preserving prior genuine failures.
-- Rotate the revision to make this operation idempotent and reject stale workers.
create or replace function public.defer_product_seo_quota(p_product_id uuid, p_revision uuid, p_retry_at timestamptz, p_message text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.product_seo_jobs set
    attempts = greatest(0, attempts - 1),
    available_at = greatest(now() + interval '1 minute', p_retry_at),
    last_error = left(p_message, 500), revision = gen_random_uuid()
  where product_id = p_product_id and revision = p_revision;
  return found;
end $$;

revoke all on function public.pause_gemini_quota(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.defer_product_seo_quota(uuid, uuid, timestamptz, text) from public, anon, authenticated;
grant execute on function public.pause_gemini_quota(text, text, timestamptz) to service_role;
grant execute on function public.defer_product_seo_quota(uuid, uuid, timestamptz, text) to service_role;

-- Existing failed jobs are intentionally retained. Requeue reviewed items in the panel.
commit;
