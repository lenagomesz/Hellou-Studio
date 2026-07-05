-- ✅ ATIVAR PRODUTO STL
-- Cole este script no SQL Editor do Supabase e clique "Run"

UPDATE products
SET active = true
WHERE name LIKE '%Chaveiro Coração%Good Things Ahead%';

-- Verificar resultado
SELECT id, name, type, active
FROM products
WHERE name LIKE '%Chaveiro Coração%Good Things Ahead%';
