-- LEGADO: migracao manual de tags e historico de precos.
CREATE TABLE IF NOT EXISTS product_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction table for products <-> tags (many-to-many)
CREATE TABLE IF NOT EXISTS product_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES product_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, tag_id)
);

-- Price History table
CREATE TABLE IF NOT EXISTS product_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price NUMERIC(10,2) NOT NULL,
  new_price NUMERIC(10,2) NOT NULL,
  price_type TEXT NOT NULL DEFAULT 'base_price', -- 'base_price' or 'sale_price'
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saved Filters table
CREATE TABLE IF NOT EXISTS saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_tag_assignments_product ON product_tag_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_tag_assignments_tag ON product_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_product_price_history_product ON product_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_product_price_history_changed_at ON product_price_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_saved_filters_user ON saved_filters(user_id);

-- Seed default tags
INSERT INTO product_tags (name, color) VALUES
  ('Best Seller', '#EF4444'),
  ('On Sale', '#F97316'),
  ('New', '#22C55E'),
  ('Trending', '#8B5CF6'),
  ('Staff Pick', '#EC4899'),
  ('Limited Edition', '#F59E0B')
ON CONFLICT (name) DO NOTHING;

-- RLS Policies
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

-- product_tags: anyone can read, admin can write
CREATE POLICY "Anyone can read tags" ON product_tags FOR SELECT USING (true);
CREATE POLICY "Admin can manage tags" ON product_tags FOR ALL USING (true);

-- product_tag_assignments: anyone can read, admin can write
CREATE POLICY "Anyone can read tag assignments" ON product_tag_assignments FOR SELECT USING (true);
CREATE POLICY "Admin can manage tag assignments" ON product_tag_assignments FOR ALL USING (true);

-- product_price_history: admin only
CREATE POLICY "Admin can read price history" ON product_price_history FOR SELECT USING (true);
CREATE POLICY "Admin can insert price history" ON product_price_history FOR INSERT WITH CHECK (true);

-- saved_filters: user owns their filters
CREATE POLICY "Users can manage own filters" ON saved_filters FOR ALL USING (true);
