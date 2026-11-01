-- Novo item natalino. As tabelas existentes permanecem protegidas por
-- ENABLE ROW LEVEL SECURITY.
INSERT INTO public.products (name, slug, description, category, type, base_price, image_url, images, active, fulfillment_mode, is_customizable, customization_sections)
SELECT 'Pinguim Tricotado', 'pinguim-tricotado', 'Pinguim natalino com textura de tricô, gorro vermelho e detalhes delicados. Uma peça divertida para decorar ou incluir no seu kit de Natal.', 'decoracao', 'physical', 25.90, '/images/catalogo-natal-2026/pinguim-tricotado.png', ARRAY['/images/catalogo-natal-2026/pinguim-tricotado.png'], true, 'made_to_order', false, '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'pinguim-tricotado');

INSERT INTO public.product_tag_assignments (product_id, tag_id)
SELECT product.id, tag.id FROM public.products product CROSS JOIN public.product_tags tag
WHERE product.slug IN ('pinguim-tricotado', 'bandeja-oval-natalina', 'monte-seu-kit-natalino', 'monte-seu-kit-religioso') AND lower(tag.name) = 'natal'
AND NOT EXISTS (SELECT 1 FROM public.product_tag_assignments assignment WHERE assignment.product_id = product.id AND assignment.tag_id = tag.id);

UPDATE public.store_settings
SET settings = jsonb_set(
  settings,
  '{home,heroSlides,0}',
  '{"id":"monte-seu-kit","href":"/kits","badge":"Kits de Natal","title":"do seu jeito","trust":["Bandeja média inclusa","Cores disponíveis","Peças escolhidas por você"],"accent":"Monte seu Kit","action":"Começar meu kit","active":true,"description":"Crie uma composição natalina ou religiosa: escolha a bandeja, a cor e as peças que mais combinam com o seu momento.","imageUrl":"/images/catalogo-natal-2026/monte-seu-kit-natalino.jpg"}'::jsonb,
  true
), updated_at = now();
