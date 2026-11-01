-- Fotos de catálogo em fundo rosa e produtos confirmados da coleção de Natal.

UPDATE public.products
SET
  image_url = '/images/catalogo-natal-2026/miniatura-jesus-cristo-sem-cadeira.png',
  image_url_2 = '/images/catalogo-natal-2026/miniatura-jesus-cristo-com-cadeira.png',
  images = ARRAY[
    '/images/catalogo-natal-2026/miniatura-jesus-cristo-sem-cadeira.png',
    '/images/catalogo-natal-2026/miniatura-jesus-cristo-com-cadeira.png'
  ],
  image_alt_texts = jsonb_build_object(
    '/images/catalogo-natal-2026/miniatura-jesus-cristo-sem-cadeira.png', 'Miniatura Jesus Cristo sem cadeira sobre fundo rosa.',
    '/images/catalogo-natal-2026/miniatura-jesus-cristo-com-cadeira.png', 'Miniatura Jesus Cristo com cadeira sobre fundo rosa.'
  ),
  updated_at = now()
WHERE slug = 'miniatura-jesus-cristo';

UPDATE public.product_options
SET image_url = CASE name
  WHEN 'Sem cadeira' THEN '/images/catalogo-natal-2026/miniatura-jesus-cristo-sem-cadeira.png'
  WHEN 'Com cadeira' THEN '/images/catalogo-natal-2026/miniatura-jesus-cristo-com-cadeira.png'
END
WHERE product_id = (SELECT id FROM public.products WHERE slug = 'miniatura-jesus-cristo')
  AND name IN ('Sem cadeira', 'Com cadeira');

INSERT INTO public.products (
  name, slug, description, category, type, base_price, image_url, images,
  image_alt_texts, active, fulfillment_mode, is_customizable,
  customization_sections, seo_title, seo_description, seo_keywords, seo_search_text
)
SELECT item.name, item.slug, item.description, 'decoracao', 'physical', item.base_price,
  item.image_url, ARRAY[item.image_url], jsonb_build_object(item.image_url, item.alt_text),
  true, 'made_to_order', false, '[]'::jsonb, item.seo_title, item.seo_description,
  item.keywords, item.search_text
FROM (VALUES
  ('Divino Espírito Santo', 'divino-espirito-santo', 'Peça decorativa do Divino Espírito Santo, com pomba em destaque e composição em tons de branco e dourado. Uma escolha cheia de significado para presentear ou compor um cantinho especial.', 35.90::numeric, '/images/catalogo-natal-2026/divino-espirito-santo.png', 'Peça decorativa do Divino Espírito Santo sobre fundo rosa.', 'Divino Espírito Santo | Hellou Studio', 'Peça decorativa do Divino Espírito Santo em branco e dourado.', ARRAY['divino espírito santo', 'decoração religiosa', 'natal'], 'divino espirito santo decoração religiosa natal'),
  ('Nossa Senhora Aparecida Mini', 'nossa-senhora-aparecida-mini', 'Miniatura decorativa de Nossa Senhora Aparecida, com manto azul e detalhes dourados. Uma peça delicada para presentear ou compor um espaço de fé e significado.', 19.90::numeric, '/images/catalogo-natal-2026/nossa-senhora-aparecida-mini.png', 'Miniatura de Nossa Senhora Aparecida sobre fundo rosa.', 'Nossa Senhora Aparecida Mini | Hellou Studio', 'Miniatura decorativa de Nossa Senhora Aparecida com manto azul e detalhes dourados.', ARRAY['nossa senhora aparecida', 'miniatura religiosa', 'natal'], 'nossa senhora aparecida miniatura religiosa natal'),
  ('Decoração Feliz Natal Mini', 'decoracao-feliz-natal-mini', 'Decoração mini com a mensagem Feliz Natal e floco de neve em destaque. Um detalhe festivo para complementar mesas, aparadores e presentes na temporada.', 25.90::numeric, '/images/catalogo-natal-2026/decoracao-feliz-natal-mini.png', 'Decoração Feliz Natal Mini vermelha sobre fundo rosa.', 'Decoração Feliz Natal Mini | Hellou Studio', 'Decoração mini Feliz Natal com floco de neve.', ARRAY['feliz natal', 'decoração natalina', 'natal'], 'feliz natal decoração natalina mini')
) AS item(name, slug, description, base_price, image_url, alt_text, seo_title, seo_description, keywords, search_text)
WHERE NOT EXISTS (SELECT 1 FROM public.products existing WHERE existing.slug = item.slug);

INSERT INTO public.product_tag_assignments (product_id, tag_id)
SELECT product.id, tag.id
FROM public.products product
CROSS JOIN (SELECT id FROM public.product_tags WHERE lower(name) = 'natal') tag
WHERE product.slug IN (
  'miniatura-jesus-cristo',
  'divino-espirito-santo',
  'nossa-senhora-aparecida-mini',
  'decoracao-feliz-natal-mini'
)
AND NOT EXISTS (
  SELECT 1 FROM public.product_tag_assignments assignment
  WHERE assignment.product_id = product.id AND assignment.tag_id = tag.id
);
