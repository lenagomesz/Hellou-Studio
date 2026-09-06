-- Preenche URLs amigáveis para produtos antigos sem alterar UUIDs ou relacionamentos.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

WITH normalized AS (
  SELECT
    id,
    COALESCE(
      NULLIF(
        trim(BOTH '-' FROM regexp_replace(
          lower(translate(name, 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn')),
          '[^a-z0-9]+', '-', 'g'
        )),
        ''
      ),
      'produto'
    ) AS base_slug
  FROM public.products
  WHERE slug IS NULL OR btrim(slug) = ''
), ranked AS (
  SELECT
    id,
    base_slug,
    count(*) OVER (PARTITION BY base_slug) AS duplicate_count
  FROM normalized
)
UPDATE public.products AS product
SET slug = CASE
  WHEN ranked.duplicate_count = 1
    AND NOT EXISTS (
      SELECT 1 FROM public.products existing
      WHERE existing.slug = ranked.base_slug AND existing.id <> ranked.id
    )
    THEN left(ranked.base_slug, 120)
  ELSE left(ranked.base_slug, 111) || '-' || left(ranked.id::text, 8)
END
FROM ranked
WHERE product.id = ranked.id;
