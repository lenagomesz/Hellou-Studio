-- ✅ EXECUTE PRIMEIRO PARA VER A ESTRUTURA DA TABELA
-- Cole este script no SQL Editor do Supabase e clique "Run"

-- Mostra a estrutura da tabela products
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
