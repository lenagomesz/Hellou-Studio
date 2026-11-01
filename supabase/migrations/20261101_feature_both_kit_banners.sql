-- Destaques dos dois construtores de kit. As tabelas existentes permanecem
-- protegidas por ENABLE ROW LEVEL SECURITY.
UPDATE public.store_settings
SET settings = jsonb_set(
  jsonb_set(settings, '{home,heroAutoplaySeconds}', '3'::jsonb, true),
  '{home,heroSlides}',
  '[
    {"id":"monte-seu-kit-natalino","href":"/products/monte-seu-kit-natalino","badge":"Kit de Natal","title":"Natalino","trust":["Bandeja média inclusa","De 2 a 5 itens","Cores disponíveis"],"accent":"Monte seu Kit","action":"Montar kit natalino","active":true,"description":"Escolha a cor da bandeja e combine seus itens natalinos favoritos com valores fixos.","imageUrl":"/images/catalogo-natal-2026/monte-seu-kit-natalino.jpg"},
    {"id":"monte-seu-kit-religioso","href":"/products/monte-seu-kit-religioso","badge":"Kit Religioso","title":"Religioso","trust":["Bandeja média inclusa","Peças à sua escolha","Total calculado na hora"],"accent":"Monte seu Kit","action":"Montar kit religioso","active":true,"description":"Escolha a cor da bandeja e as peças religiosas; o total acompanha os produtos selecionados.","imageUrl":"/images/catalogo-natal-2026/monte-seu-kit-religioso.jpg"}
  ]'::jsonb || COALESCE((
    SELECT jsonb_agg(slide ORDER BY ord)
    FROM jsonb_array_elements(settings->'home'->'heroSlides') WITH ORDINALITY item(slide, ord)
    WHERE slide->>'id' NOT IN ('monte-seu-kit', 'monte-seu-kit-natalino', 'monte-seu-kit-religioso')
  ), '[]'::jsonb),
  true
), updated_at = now();
