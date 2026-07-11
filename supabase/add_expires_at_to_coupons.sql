-- ============================================================================
-- Migration: Add expires_at column to coupons table
-- Rodar no Supabase SQL Editor (Project → SQL Editor → New query → paste → Run)
-- ============================================================================

-- Add expires_at column if it doesn't exist
alter table public.coupons add column if not exists expires_at timestamptz;

-- Verify the column was added
-- select column_name, data_type from information_schema.columns
-- where table_name = 'coupons' and column_name = 'expires_at';
