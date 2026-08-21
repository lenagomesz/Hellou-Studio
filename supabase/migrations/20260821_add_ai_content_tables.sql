-- AI Content Tables Migration

-- ============================================================================
-- ai_brand_voice: Editable brand guidelines for AI content generation
-- ============================================================================
create table if not exists public.ai_brand_voice (
  id            uuid primary key default gen_random_uuid(),
  tone          text not null default 'balanced',
  tone_description text,
  target_age_min integer default 18,
  target_age_max integer default 45,
  interests      text[] default array['geek', 'design', 'organization'],
  brand_rules    text not null default 'Never mention 3D printing, filament, printer, or manufacturing terms. Focus on art, design, lifestyle, and product value.',
  language       text not null default 'pt-BR',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ============================================================================
-- ai_generated_content: Logs of all AI-generated content for tracking
-- ============================================================================
create table if not exists public.ai_generated_content (
  id            uuid primary key default gen_random_uuid(),
  feature_type  text not null check (feature_type in ('market_trends', 'social_campaign', 'blog_post')),
  product_id    uuid references public.products(id) on delete set null,
  content       jsonb not null,
  tokens_used   integer,
  generated_at  timestamptz not null default now(),
  generated_by  uuid references public.users(id) on delete set null
);

-- ============================================================================
-- blog_posts: SEO blog posts with full editorial control
-- ============================================================================
create table if not exists public.blog_posts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text not null unique,
  content       text not null,
  excerpt       text,
  featured_product_id uuid references public.products(id) on delete set null,
  status        text not null default 'published' check (status in ('draft', 'published')),
  seo_keywords  text[],
  created_at    timestamptz not null default now(),
  published_at  timestamptz,
  edited_at     timestamptz,
  generated_by  uuid references public.users(id) on delete set null,
  ai_generated  boolean default true
);

-- Create indexes for common queries
create index if not exists idx_blog_posts_status on public.blog_posts(status);
create index if not exists idx_blog_posts_slug on public.blog_posts(slug);
create index if not exists idx_ai_generated_feature_type on public.ai_generated_content(feature_type);
create index if not exists idx_ai_generated_product_id on public.ai_generated_content(product_id);

-- ============================================================================
-- Insert default brand voice record
-- ============================================================================
insert into public.ai_brand_voice (tone, tone_description, interests, brand_rules)
values (
  'balanced',
  'Approachable but credible, friendly but professional, appeals to broad audience',
  array['geek', 'pop-culture', 'design', 'organization', 'gaming', 'anime'],
  'CRITICAL RULES: Never mention 3D printing, printer, filament, resina, bico, camadas, fatiador, or any manufacturing terms. Focus ONLY on: the final product beauty, lifestyle value, design innovation, practical utility, exclusivity, and art. Customers buy the finished piece, not the process.'
)
on conflict do nothing;
