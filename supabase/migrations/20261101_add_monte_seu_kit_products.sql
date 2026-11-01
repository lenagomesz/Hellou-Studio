-- Produtos-base para as duas experiências Monte seu Kit. As tabelas existentes
-- permanecem protegidas por ENABLE ROW LEVEL SECURITY.
INSERT INTO public.products (name, slug, description, category, type, base_price, active, fulfillment_mode, is_customizable, customization_question, customization_help_text, customization_sections)
SELECT item.name, item.slug, item.description, 'decoracao', 'physical', item.base_price, true, 'made_to_order', true, 'Descreva as escolhas do seu kit', 'A bandeja média e as peças escolhidas ficam registradas no pedido.', '[]'::jsonb
FROM (VALUES
 ('Monte seu Kit Natalino', 'monte-seu-kit-natalino', 'Monte um kit com bandeja média e de 2 a 5 itens natalinos. Escolha a cor da bandeja e seus favoritos.', 69.90::numeric),
 ('Monte seu Kit Religioso', 'monte-seu-kit-religioso', 'Monte seu kit religioso com bandeja média e peças escolhidas por você. O total é calculado pela soma das peças.', 24.90::numeric)
) AS item(name, slug, description, base_price)
WHERE NOT EXISTS (SELECT 1 FROM public.products existing WHERE existing.slug = item.slug);

INSERT INTO public.product_options (product_id, name, variation_label, price_modifier, stock, sort_order, active)
SELECT product.id, option_data.name, 'Quantidade de itens', option_data.price_modifier, 0, option_data.sort_order, true
FROM public.products product
CROSS JOIN (VALUES ('Bandeja média + 2 itens', 0.00::numeric, 0), ('Bandeja média + 3 itens', 20.00::numeric, 10), ('Bandeja média + 4 itens', 40.00::numeric, 20), ('Bandeja média + 5 itens', 50.00::numeric, 30)) AS option_data(name, price_modifier, sort_order)
WHERE product.slug = 'monte-seu-kit-natalino'
AND NOT EXISTS (SELECT 1 FROM public.product_options existing WHERE existing.product_id = product.id AND existing.name = option_data.name);
