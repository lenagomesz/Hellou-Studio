-- 🔍 DEBUG: Listar todos os produtos digitais
SELECT
  id,
  name,
  type,
  active,
  image_url,
  image_url_2,
  price,
  category,
  created_at
FROM products
WHERE type = 'digital'
ORDER BY created_at DESC;

-- Contar total
SELECT COUNT(*) as total_digital_products
FROM products
WHERE type = 'digital';

-- Contar ativos
SELECT COUNT(*) as active_digital_products
FROM products
WHERE type = 'digital' AND active = true;
