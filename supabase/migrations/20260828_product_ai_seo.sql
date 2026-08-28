-- Additive migration. Existing editorial SEO is never replaced by the backfill.
begin;
alter table public.products
  add column if not exists seo_keywords text[] not null default '{}',
  add column if not exists image_alt_texts jsonb not null default '{}',
  add column if not exists seo_ai_generated jsonb not null default '{}';
alter table public.products add column if not exists seo_search_text text not null default '';
create or replace function public.sync_product_seo_search() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.seo_search_text := array_to_string(new.seo_keywords, ' ');
  return new;
end $$;
create or replace trigger sync_product_seo_search
before insert or update of seo_keywords on public.products
for each row execute function public.sync_product_seo_search();
update public.products set seo_search_text = array_to_string(seo_keywords, ' ')
where seo_search_text is distinct from array_to_string(seo_keywords, ' ');

create table if not exists public.product_seo_jobs (
  product_id uuid primary key references public.products(id) on delete cascade,
  revision uuid not null default gen_random_uuid(),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now()
);
alter table public.product_seo_jobs enable row level security;
alter table public.products enable row level security;
revoke all on public.product_seo_jobs from anon, authenticated;
grant all on public.product_seo_jobs to service_role;

create or replace function public.enqueue_product_seo() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if current_setting('hellou.seo_worker', true) = 'on' then return new; end if;
  if new.category = 'encomenda' then
    delete from public.product_seo_jobs where product_id = new.id;
    return new;
  end if;
  if TG_OP = 'INSERT' then
    insert into public.product_seo_jobs(product_id) values (new.id)
    on conflict (product_id) do nothing;
  elsif row(new.name, new.description, new.category, new.type, new.image_url, new.image_url_2,
            new.images, new.seo_title, new.seo_description, new.seo_keywords, new.image_alt_texts)
    is distinct from
        row(old.name, old.description, old.category, old.type, old.image_url, old.image_url_2,
            old.images, old.seo_title, old.seo_description, old.seo_keywords, old.image_alt_texts) then
    insert into public.product_seo_jobs(product_id) values (new.id)
    on conflict (product_id) do update set revision = gen_random_uuid(), attempts = 0,
      available_at = now(), last_error = null;
  end if;
  return new;
end $$;

create or replace trigger enqueue_product_seo
after insert or update on public.products
for each row execute function public.enqueue_product_seo();

-- Durable leases prevent duplicate work across instances. Failed jobs retry at most three times.
create or replace function public.claim_product_seo(p_product_id uuid default null, p_limit integer default 3)
returns setof public.product_seo_jobs
language sql security definer set search_path = public, pg_temp as $$
  update public.product_seo_jobs j set attempts = j.attempts + 1, available_at = now() + interval '10 minutes'
  where j.product_id in (
    select q.product_id from public.product_seo_jobs q
    where q.available_at <= now() and q.attempts < 3
      and (p_product_id is null or q.product_id = p_product_id)
    order by q.created_at, q.product_id
    limit greatest(1, least(p_limit, 3)) for update skip locked
  ) returning j.*;
$$;

-- Lock the product first (same lock order as edits), then verify the job revision.
-- A concurrent manual edit invalidates the result rather than being overwritten.
create or replace function public.finish_product_seo(p_product_id uuid, p_revision uuid, p_patch jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform 1 from public.products where id = p_product_id for update;
  perform 1 from public.product_seo_jobs where product_id = p_product_id and revision = p_revision for update;
  if not found then return false; end if;
  perform set_config('hellou.seo_worker', 'on', true);
  update public.products set
    seo_title = case when p_patch ? 'seo_title' then p_patch->>'seo_title' else seo_title end,
    seo_description = case when p_patch ? 'seo_description' then p_patch->>'seo_description' else seo_description end,
    seo_keywords = case when p_patch ? 'seo_keywords' then array(select jsonb_array_elements_text(p_patch->'seo_keywords')) else seo_keywords end,
    image_alt_texts = coalesce(p_patch->'image_alt_texts', image_alt_texts),
    seo_ai_generated = coalesce(p_patch->'seo_ai_generated', seo_ai_generated),
    updated_at = now()
  where id = p_product_id;
  perform set_config('hellou.seo_worker', 'off', true);
  delete from public.product_seo_jobs where product_id = p_product_id and revision = p_revision;
  return true;
end $$;

revoke all on function public.enqueue_product_seo() from public, anon, authenticated;
revoke all on function public.claim_product_seo(uuid, integer) from public, anon, authenticated;
revoke all on function public.finish_product_seo(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.claim_product_seo(uuid, integer) to service_role;
grant execute on function public.finish_product_seo(uuid, uuid, jsonb) to service_role;

-- Every existing catalog item enters the queue; manual values remain protected in the worker.
insert into public.product_seo_jobs(product_id)
select id from public.products where category is distinct from 'encomenda'
on conflict (product_id) do nothing;
commit;
