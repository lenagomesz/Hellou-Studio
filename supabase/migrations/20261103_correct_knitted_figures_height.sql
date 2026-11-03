-- Altura aproximada confirmada pela loja para os bonecos tricotados.
update public.products
set height_cm = 7
where active = true
  and name in (
    'Boneco de Neve Tricotado',
    'Papai Noel Tricotado',
    'Pinguim Tricotado',
    'Rena Tricotada',
    'Ursinho Polar Natalino'
  );

alter table public.products enable row level security;
