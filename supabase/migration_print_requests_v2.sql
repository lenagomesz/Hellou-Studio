-- ============================================================================
-- Migration: Print Requests v2 - adds missing columns
-- Rodar no Supabase SQL Editor DEPOIS da migration_print_requests.sql original
-- ============================================================================

-- 1. Add missing status values to enum
alter type print_request_status add value if not exists 'needs_info' after 'pending';

-- 2. Add missing columns to print_requests
alter table public.print_requests
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists rejection_reason text,
  add column if not exists user_response text;

-- 3. Add color column to product_options (used for custom orders)
alter table public.product_options
  add column if not exists color text;
