-- ============================================================================
-- Migration: Add ALL missing columns to coupons table
-- Rodar no Supabase SQL Editor (Project → SQL Editor → New query → paste → Run)
-- ============================================================================

-- Add min_purchase column if it doesn't exist
alter table public.coupons add column if not exists min_purchase numeric(10,2) not null default 0;

-- Add max_uses column if it doesn't exist
alter table public.coupons add column if not exists max_uses integer;

-- Add free_shipping column if it doesn't exist
alter table public.coupons add column if not exists free_shipping boolean not null default false;

-- Add expires_at column if it doesn't exist
alter table public.coupons add column if not exists expires_at timestamptz;

-- Add active column if it doesn't exist
alter table public.coupons add column if not exists active boolean not null default true;

-- Verify all columns exist
-- select column_name, data_type from information_schema.columns
-- where table_name = 'coupons' order by ordinal_position;
