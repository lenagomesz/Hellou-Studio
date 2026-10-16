-- A URL aponta para um modelo GLB público, carregado somente na página do produto.
alter table public.products
  add column if not exists model_3d_url text;

comment on column public.products.model_3d_url is
  'URL pública do modelo GLB exibido no visualizador 3D do produto.';
