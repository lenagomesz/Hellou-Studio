-- Create order_ratings table for storing customer order ratings
CREATE TABLE IF NOT EXISTS order_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(order_id)
);

-- Index for looking up ratings by user
CREATE INDEX IF NOT EXISTS idx_order_ratings_user_id ON order_ratings(user_id);

-- Enable RLS
ALTER TABLE order_ratings ENABLE ROW LEVEL SECURITY;

-- Policy: users can read their own ratings
CREATE POLICY "Users can view own ratings"
  ON order_ratings FOR SELECT
  USING (user_id = auth.uid());

-- Policy: users can insert their own ratings
CREATE POLICY "Users can insert own ratings"
  ON order_ratings FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: users can update their own ratings
CREATE POLICY "Users can update own ratings"
  ON order_ratings FOR UPDATE
  USING (user_id = auth.uid());
