ALTER TABLE products ADD COLUMN type TEXT DEFAULT 'physical' CHECK (type IN ('physical', 'digital'));
ALTER TABLE products ADD COLUMN file_path TEXT;
CREATE INDEX idx_products_type ON products(type);
