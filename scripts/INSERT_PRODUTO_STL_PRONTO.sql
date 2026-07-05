-- ✅ SCRIPT PRONTO PARA EXECUTAR - Chaveiro Coração "Good Things Ahead"
-- Cole este script no SQL Editor do Supabase e clique "Run"

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
  'https://ahopngjegljhaalzdnor.supabase.co/storage/v1/object/public/stl-uploads/2BF09941-A25E-43C8-AD88-3758C46A104C.png',
  'https://ahopngjegljhaalzdnor.supabase.co/storage/v1/object/public/stl-uploads/2316B0CF-36D6-49AF-AA3D-5BA2E68219BD.png',
  'https://ahopngjegljhaalzdnor.supabase.co/storage/v1/object/public/stl-uploads/good_things_ahead_heart_keychain.stl',
  now(),
  now()
);
