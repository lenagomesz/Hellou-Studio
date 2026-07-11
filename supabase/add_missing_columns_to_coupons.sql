-- ============================================================================
-- Migration: Add missing columns to coupons table
-- Rodar no Supabase SQL Editor (Project → SQL Editor → New query → paste → Run)
-- ============================================================================

-- Add max_uses column if it doesn't exist
alter table public.coupons add column if not exists max_uses integer;

-- Add expires_at column if it doesn't exist
alter table public.coupons add column if not exists expires_at timestamptz;

-- Verify the columns were added
-- select column_name, data_type from information_schema.columns
-- where table_name = 'coupons' order by ordinal_position;
