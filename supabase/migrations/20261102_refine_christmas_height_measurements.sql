-- Atualiza as medidas aproximadas informadas pela loja.
-- Para os produtos sem referência confiável de comprimento/largura,
-- mantemos somente a altura para não sugerir precisão inexistente.

update public.products p
set
  length_cm = null,
  width_cm = null,
  height_cm = case
    when lower(p.name) = 'miniatura jesus cristo' then 7
    when lower(p.name) = 'árvore tricotada' then 7
    when lower(p.name) in (
      'boneco de neve tricotado',
      'papai noel tricotado',
      'pinguim tricotado',
      'rena tricotada',
      'ursinho polar natalino'
    ) then 3.5
    else p.height_cm
  end
where p.active = true
  and exists (
    select 1
    from public.product_tag_assignments a
    join public.product_tags t on t.id = a.tag_id
    where a.product_id = p.id
      and lower(trim(t.name)) = 'natal'
  );

alter table public.products enable row level security;
