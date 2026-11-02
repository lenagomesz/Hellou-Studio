-- Completa as duas medidas pendentes do catálogo de Natal.
-- São estimativas de apresentação baseadas na escala visual dos produtos;
-- a dimensão final pode variar conforme a escala escolhida no fatiador.

update public.products
set
  length_cm = 20,
  width_cm = 3,
  height_cm = 14,
  description = regexp_replace(coalesce(description, ''), E'\n\nMedidas aproximadas:.*$', '')
    || E'\n\nMedidas aproximadas: 20 × 3 × 14 cm (C × L × A).'
where slug = 'cenario-natalino-decorativo-com-cervo-e-pinheiros-peca-fisica';

update public.products
set
  length_cm = 13,
  width_cm = 10,
  height_cm = 2,
  description = regexp_replace(coalesce(description, ''), E'\n\nMedidas aproximadas:.*$', '')
    || E'\n\nMedidas aproximadas: 13 × 10 × 2 cm (C × L × A), por bandeja.'
where slug = 'bandejas-natalinas-para-doces';

alter table public.products enable row level security;
