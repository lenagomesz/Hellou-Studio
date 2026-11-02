-- Etapas exclusivas guardam uma fotografia da paleta. Sincroniza as duas cores
-- novas da central sem remover escolhas nem alterar a ordem das cores existentes.
with palette as (
  select jsonb_build_array(
    jsonb_build_object('id','color-b3d58cbe-c496-41c3-83cc-9ff2bae07ed5','label','Caramelo','value','#C98245','colorId','b3d58cbe-c496-41c3-83cc-9ff2bae07ed5'),
    jsonb_build_object('id','color-414e2e0d-4de5-489d-aeb1-95fff76c0276','label','Dourado','value','#E5B500','colorId','414e2e0d-4de5-489d-aeb1-95fff76c0276')
  ) colors
)
update public.products product
set customization_sections = (
  select jsonb_agg(
    case when section->>'type' in ('color','color_text') then
      jsonb_set(
        section,
        '{colors}',
        coalesce(section->'colors','[]'::jsonb) || coalesce((
          select jsonb_agg(new_color)
          from palette, jsonb_array_elements(palette.colors) new_color
          where not exists (
            select 1 from jsonb_array_elements(coalesce(section->'colors','[]'::jsonb)) existing
            where existing->>'colorId' = new_color->>'colorId'
               or lower(existing->>'label') = lower(new_color->>'label')
          )
        ), '[]'::jsonb)
      )
    else section end
    order by position
  )
  from jsonb_array_elements(product.customization_sections) with ordinality item(section, position)
)
where jsonb_array_length(coalesce(product.customization_sections,'[]'::jsonb)) > 0;

alter table public.products enable row level security;
