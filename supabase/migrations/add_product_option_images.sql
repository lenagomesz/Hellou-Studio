-- Add image_url column to product_options for variant-specific images
ALTER TABLE product_options ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Example comment: This allows each product option (color variation) to have its own image
-- When a customer selects a color, the product image updates to show that variant's photo
