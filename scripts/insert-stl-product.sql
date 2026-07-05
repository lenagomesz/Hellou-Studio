-- Script para inserir o produto STL: Chaveiro Coração "Good Things Ahead"
-- Execute este script diretamente no SQL Editor do Supabase

INSERT INTO products (
  name,
  description,
  price,
  type,
  category,
  image_url,
  image_url_2,
  file_path,
  created_at,
  updated_at
) VALUES (
  'Chaveiro Coração "Good Things Ahead" | Arquivo STL',
  'Espalhe boas energias com este charmoso chaveiro em formato de coração, trazendo a frase "Good Things Ahead" em um design moderno e delicado.

Este é um arquivo digital STL, criado pela Hellou Studio, pronto para impressão 3D. Ideal para produzir chaveiros, lembrancinhas, brindes personalizados ou itens para venda em sua loja. O modelo foi desenvolvido para oferecer uma impressão de alta qualidade e um excelente resultado final.

✨ O que você recebe:
• Arquivo STL otimizado para impressão 3D
• Design pronto para imprimir em FDM
• Tamanho: Chaveiro (~5-6cm)
• Suportes inclusos para facilitar a impressão
• Arquivo compatível com qualquer impressora 3D',
  29.90,
  'digital',
  'chaveiros',
  'https://sua-bucket.supabase.co/storage/v1/object/public/stl-products/619x619-coracao-goodthings-black-white.jpg',
  'https://sua-bucket.supabase.co/storage/v1/object/public/stl-products/619x619-coracao-goodthings-pink.jpg',
  'stl/coracao-goodthings.stl',
  now(),
  now()
);

-- Notas para você:
-- 1. Substitua 'sua-bucket' pelo nome do seu bucket no Supabase Storage
-- 2. As imagens devem estar uploaded como:
--    - 619x619-coracao-goodthings-black-white.jpg (imagem 1 - preto e branco)
--    - 619x619-coracao-goodthings-pink.jpg (imagem 2 - colorida rosa)
-- 3. O arquivo STL deve estar em: stl/coracao-goodthings.stl
-- 4. Para obter as URLs públicas, após fazer upload no Storage:
--    a) Clique no arquivo
--    b) Clique em "Copy public URL"
--    c) Cole a URL aqui
