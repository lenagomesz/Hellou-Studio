-- LEGADO: migracao manual de analytics de clientes.
-- This migration adds VIP support and optimized indexes for customer analytics

-- Add VIP column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;

-- Create index for fast VIP lookups
CREATE INDEX IF NOT EXISTS idx_users_is_vip ON users (is_vip) WHERE is_vip = true;

-- Create indexes for optimized analytics queries
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at ON orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);

-- Composite index for RFM/LTV queries (user orders with totals and dates)
CREATE INDEX IF NOT EXISTS idx_orders_user_status_total ON orders (user_id, status, total);

-- Index for cohort analysis (users by registration date)
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);
