-- ✅ MIGRATION - Adicionar colunas faltando na tabela products
-- Cole este script no SQL Editor do Supabase e clique "Run"

-- Adicionar coluna 'type' para diferenciar digital de físico
ALTER TABLE products ADD COLUMN IF NOT EXISTS type text DEFAULT 'physical';

-- Adicionar coluna 'image_url_2' para segunda imagem
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url_2 text;

-- Adicionar coluna 'file_path' para arquivo STL
ALTER TABLE products ADD COLUMN IF NOT EXISTS file_path text;

-- Pronto! Agora a tabela tem as colunas necessárias
