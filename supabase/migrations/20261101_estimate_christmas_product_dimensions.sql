-- Medidas comerciais estimadas a partir das proporções dos modelos e perfis
-- de impressão. As tabelas existentes permanecem protegidas por
-- ENABLE ROW LEVEL SECURITY.
WITH measurements(slug, length_cm, width_cm, height_cm, measure_text) AS (VALUES
  ('arvore-de-natal-decorativa-com-vela-led',12::numeric,12::numeric,18::numeric,'12 × 12 × 18 cm (C × L × A)'),
  ('arvore-de-natal-decorativa-luminosa',10,10,15,'10 × 10 × 15 cm (C × L × A)'),
  ('arvore-de-ursinhos-de-natal',14,12,19,'14 × 12 × 19 cm (C × L × A)'),
  ('arvore-natalina-articulada',11,9,17,'11 × 9 × 17 cm (C × L × A)'),
  ('arvore-tricotada',9,9,13,'9 × 9 × 13 cm (C × L × A)'),
  ('bandeja-oval-natalina',25,18,3,'Pequena: até 15 cm; média: 16 a 20 cm; grande: 21 a 25 cm. Altura aproximada de 3 cm'),
  ('bolinhas-natal-personalizadas-4-modelos',8,1,8,'8 × 1 × 8 cm (C × L × A), por unidade'),
  ('boneco-de-neve-tricotado',8,7,11,'8 × 7 × 11 cm (C × L × A)'),
  ('decoracao-feliz-natal-mini',13,3,10,'13 × 3 × 10 cm (C × L × A)'),
  ('decoracao-ho-ho-ho-com-rena',10,5,18,'10 × 5 × 18 cm (C × L × A)'),
  ('divino-espirito-santo',18,6,16,'18 × 6 × 16 cm (C × L × A)'),
  ('gnomo-natalino',10,8,18,'10 × 8 × 18 cm (C × L × A)'),
  ('kit-natal-tricotado-5-pecas',25,25,22,'25 × 25 × 22 cm (C × L × A), considerando a composição montada'),
  ('kit-porta-guardanapos-natalinos-gorro-guirlanda-e-rena',6,5,6,'6 × 5 × 6 cm (C × L × A), por peça'),
  ('kit-vila-aconchegante-luminosa-decorativa-com-casinha-e-igreja',18,12,16,'18 × 12 × 16 cm (C × L × A), considerando o conjunto'),
  ('bolas-de-natal-vazadas',18,5,18,'18 × 5 × 18 cm (C × L × A)'),
  ('miniatura-jesus-cristo',10,8,15,'Sem cadeira: cerca de 8 × 7 × 12 cm; com cadeira: cerca de 10 × 8 × 15 cm'),
  ('monte-seu-kit-natalino',20,15,20,'20 × 15 × até 20 cm (C × L × A), variando conforme as peças escolhidas'),
  ('monte-seu-kit-religioso',20,15,20,'20 × 15 × até 20 cm (C × L × A), variando conforme as peças escolhidas'),
  ('nossa-senhora-aparecida-mini',7,7,13,'7 × 7 × 13 cm (C × L × A)'),
  ('papai-noel-gordinho-enfeite-natalino',12,10,15,'12 × 10 × 15 cm (C × L × A)'),
  ('trio-de-papais-noeis-porta-vela',10,9,20,'10 × 9 × até 20 cm (C × L × A), conforme o modelo escolhido'),
  ('papai-noel-tricotado',8,8,11,'8 × 8 × 11 cm (C × L × A)'),
  ('pinguim-tricotado',8,8,11,'8 × 8 × 11 cm (C × L × A)'),
  ('porta-bombom-natalino-4-modelos',7,4,10,'7 × 4 × 10 cm (C × L × A), por unidade'),
  ('porta-doces-gorro-papai-noel',14,14,15,'14 × 14 × 15 cm (C × L × A)'),
  ('porta-guardanapos-laco-natalino',16,6,12,'16 × 6 × 12 cm (C × L × A)'),
  ('porta-guardanapos-presente',12,5,10,'12 × 5 × 10 cm (C × L × A)'),
  ('presepio-iluminado-estrela-de-belem',20,5,16,'20 × 5 × 16 cm (C × L × A)'),
  ('presepio-sagrada-familia',22,7,18,'22 × 7 × 18 cm (C × L × A)'),
  ('rena-tricotada',8,8,11,'8 × 8 × 11 cm (C × L × A)'),
  ('sagrada-familia-minimalista',14,8,17,'14 × 8 × 17 cm (C × L × A)'),
  ('ursinho-polar-natalino',8,8,11,'8 × 8 × 11 cm (C × L × A)')
)
UPDATE public.products product SET
  length_cm = measurement.length_cm,
  width_cm = measurement.width_cm,
  height_cm = measurement.height_cm,
  description = split_part(coalesce(product.description, ''), E'\n\nMedidas aproximadas:', 1)
    || E'\n\nMedidas aproximadas: ' || measurement.measure_text || '.',
  updated_at = now()
FROM measurements measurement
WHERE product.slug = measurement.slug;
