-- ============================================================================
-- Migration: Add missing columns to products table
-- Rodar no Supabase SQL Editor (Project → SQL Editor → New query → paste → Run)
-- ============================================================================

-- Add sale_price column if it doesn't exist
alter table public.products add column if not exists sale_price numeric(10,2);

-- Add images column if it doesn't exist (stores array of image URLs)
alter table public.products add column if not exists images text[];

-- Add type column if it doesn't exist (physical, digital, stl)
alter table public.products add column if not exists type text;

-- Verify columns were added
-- select column_name, data_type from information_schema.columns
-- where table_name = 'products' order by ordinal_position;
