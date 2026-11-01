-- Catálogo: bandeja avulsa. As tabelas existentes permanecem protegidas por
-- ENABLE ROW LEVEL SECURITY; esta migração somente inclui dados comerciais.

INSERT INTO public.products (name, slug, description, category, type, base_price, image_url, images, active, fulfillment_mode, is_customizable, customization_question, customization_help_text, customization_sections)
SELECT 'Bandeja Oval Natalina', 'bandeja-oval-natalina',
  'Bandeja oval com acabamento canelado para montar cantinhos natalinos, organizar doces ou compor presentes. Escolha o tamanho e a cor que combinam com a sua decoração.',
  'decoracao', 'physical', 19.90, '/images/catalogo-natal-2026/bandeja-oval-vermelha.png',
  ARRAY['/images/catalogo-natal-2026/bandeja-oval-vermelha.png'], true, 'made_to_order', true,
  'Escolha a cor da sua bandeja', 'Cores disponíveis: creme, vermelho, verde, marrom e caramelo.', '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE slug = 'bandeja-oval-natalina');

INSERT INTO public.product_options (product_id, name, variation_label, price_modifier, stock, sort_order, active)
SELECT product.id, option_data.name, 'Tamanho', option_data.price_modifier, 0, option_data.sort_order, true
FROM public.products product
CROSS JOIN (VALUES
  ('Pequena — até 15 cm', 0.00::numeric, 0),
  ('Média — 16 a 20 cm', 10.00::numeric, 10),
  ('Grande — 21 a 25 cm', 20.00::numeric, 20)
) AS option_data(name, price_modifier, sort_order)
WHERE product.slug = 'bandeja-oval-natalina'
AND NOT EXISTS (SELECT 1 FROM public.product_options existing WHERE existing.product_id = product.id AND existing.name = option_data.name);
