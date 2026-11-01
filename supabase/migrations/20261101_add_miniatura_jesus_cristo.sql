-- Produto da coleção de Natal: opções confirmadas pela loja.
-- A imagem permanece pendente para não usar o card de coleção como foto individual.

WITH inserted_product AS (
  INSERT INTO public.products (
    name, slug, description, category, type, base_price, active,
    fulfillment_mode, is_customizable, customization_sections,
    seo_title, seo_description, seo_keywords, seo_search_text
  )
  SELECT
    'Miniatura Jesus Cristo',
    'miniatura-jesus-cristo',
    'Uma miniatura decorativa de Jesus Cristo para compor cantinhos especiais, presentear ou incluir em uma decoração de Natal cheia de significado. Escolha o modelo que prefere: a peça avulsa ou a versão com cadeira.',
    'decoracao', 'physical', 24.90, true,
    'made_to_order', false, '[]'::jsonb,
    'Miniatura Jesus Cristo | Hellou Studio',
    'Miniatura decorativa de Jesus Cristo disponível nas versões sem cadeira ou com cadeira.',
    ARRAY['jesus cristo', 'miniatura religiosa', 'decoração natalina'],
    'jesus cristo miniatura religiosa decoração natalina cadeira'
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'miniatura-jesus-cristo')
  RETURNING id
), product_ref AS (
  SELECT id FROM inserted_product
  UNION ALL
  SELECT id FROM public.products WHERE slug = 'miniatura-jesus-cristo'
  LIMIT 1
), inserted_options AS (
  INSERT INTO public.product_options (product_id, name, variation_label, price_modifier, stock, sort_order, active)
  SELECT product_ref.id, option_data.name, 'Modelo', option_data.price_modifier, 0, option_data.sort_order, true
  FROM product_ref
  CROSS JOIN (VALUES
    ('Sem cadeira', 0.00::numeric, 0),
    ('Com cadeira', 10.00::numeric, 10)
  ) AS option_data(name, price_modifier, sort_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.product_options existing
    WHERE existing.product_id = product_ref.id AND existing.name = option_data.name
  )
  RETURNING product_id
)
INSERT INTO public.product_tag_assignments (product_id, tag_id)
SELECT product_ref.id, tag.id
FROM product_ref
JOIN public.product_tags tag ON lower(tag.name) = 'natal'
ON CONFLICT DO NOTHING;
