-- Valores e nome confirmados para produtos da coleção de Natal.
-- Nenhuma tabela ou política é criada nesta migração; as tabelas existentes
-- permanecem protegidas por ENABLE ROW LEVEL SECURITY.

UPDATE public.products
SET
  name = 'Árvore de Natal Decorativa Luminosa',
  slug = 'arvore-de-natal-decorativa-luminosa',
  base_price = 25.90,
  updated_at = now()
WHERE slug = 'arvore-de-natal-decorativa-luminosa-para-decoracao';

UPDATE public.products
SET
  base_price = 40.90,
  updated_at = now()
WHERE slug = 'presepio-iluminado-estrela-de-belem';

-- A opção "Com LED" conserva o adicional de R$ 5,00, totalizando R$ 45,90.
