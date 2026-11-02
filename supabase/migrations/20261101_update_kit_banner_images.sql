-- Os banners possuem imagens próprias e não herdam automaticamente a capa do produto.
update public.store_settings
set settings = jsonb_set(
  settings,
  '{home,heroSlides}',
  (
    select jsonb_agg(
      case slide->>'id'
        when 'monte-seu-kit-natalino' then jsonb_set(slide, '{imageUrl}', '"/images/catalogo-natal-2026/banner-kit-natalino.png"'::jsonb)
        when 'monte-seu-kit-religioso' then jsonb_set(slide, '{imageUrl}', '"/images/catalogo-natal-2026/banner-kit-religioso.png"'::jsonb)
        else slide
      end
      order by position
    )
    from jsonb_array_elements(settings->'home'->'heroSlides') with ordinality item(slide, position)
  ),
  false
), updated_at = now()
where id = 'default';

alter table public.store_settings enable row level security;
