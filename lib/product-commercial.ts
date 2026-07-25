export type ProductCommercialInput = {
  sku?: string | null;
  cost_price?: number | null;
  weight_grams?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
  slug?: string | null;
};

export function createProductSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

function nullableText(value: unknown, maxLength: number) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('Texto inválido');
  return value.trim().slice(0, maxLength) || null;
}

function nullableNumber(value: unknown, options: { integer?: boolean; positive?: boolean } = {}) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Número inválido');
  if (options.positive ? value <= 0 : value < 0) throw new Error('O valor não pode ser negativo ou zero');
  return options.integer ? Math.trunc(value) : Math.round(value * 100) / 100;
}

export function normalizeProductCommercialFields(input: ProductCommercialInput) {
  const sku = nullableText(input.sku, 80)?.toUpperCase() ?? null;
  if (sku && !/^[A-Z0-9][A-Z0-9._-]{1,79}$/.test(sku)) {
    throw new Error('SKU inválido. Use letras, números, ponto, hífen ou sublinhado');
  }

  const rawSlug = nullableText(input.slug, 120);
  const slug = rawSlug ? createProductSlug(rawSlug) : null;
  if (rawSlug && !slug) throw new Error('Slug inválido');

  return {
    sku,
    cost_price: nullableNumber(input.cost_price),
    weight_grams: nullableNumber(input.weight_grams, { integer: true, positive: true }),
    length_cm: nullableNumber(input.length_cm, { positive: true }),
    width_cm: nullableNumber(input.width_cm, { positive: true }),
    height_cm: nullableNumber(input.height_cm, { positive: true }),
    seo_title: nullableText(input.seo_title, 70) ?? null,
    seo_description: nullableText(input.seo_description, 180) ?? null,
    slug,
  };
}

