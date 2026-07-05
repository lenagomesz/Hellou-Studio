-- ✅ CORRIGIR PRODUTO STL - Adicionar campos faltando
-- Cole este script APÓS executar a MIGRATION_ADICIONAR_COLUNAS
-- No SQL Editor do Supabase e clique "Run"

-- Atualizar o produto que foi inserido para ser DIGITAL e adicionar as imagens
UPDATE products
SET
  type = 'digital',
  image_url_2 = 'https://ahopngjegljhaalzdnor.supabase.co/storage/v1/object/public/stl-uploads/2316B0CF-36D6-49AF-AA3D-5BA2E68219BD.png',
  file_path = 'https://ahopngjegljhaalzdnor.supabase.co/storage/v1/object/public/stl-uploads/good_things_ahead_heart_keychain.stl'
WHERE name LIKE '%Chaveiro Coração%Good Things Ahead%';

-- ✅ Pronto! Agora o produto será exibido APENAS na página STL
