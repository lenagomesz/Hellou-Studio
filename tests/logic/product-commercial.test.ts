import { describe, expect, it } from 'vitest';
import { createProductSlug, normalizeProductCommercialFields } from '@/lib/product-commercial';

describe('product commercial fields', () => {
  it('normalizes SKU, slug and decimal fields', () => {
    expect(normalizeProductCommercialFields({
      sku: ' chv-rosa_01 ',
      slug: 'Chaveiro Coração Rosa',
      cost_price: 10.257,
      weight_grams: 150.9,
      length_cm: 12.345,
    })).toMatchObject({
      sku: 'CHV-ROSA_01',
      slug: 'chaveiro-coracao-rosa',
      cost_price: 10.26,
      weight_grams: 150,
      length_cm: 12.35,
    });
  });

  it('rejects invalid logistics values', () => {
    expect(() => normalizeProductCommercialFields({ weight_grams: 0 })).toThrow();
    expect(() => normalizeProductCommercialFields({ sku: 'inválido espaço' })).toThrow();
  });

  it('creates a safe URL slug', () => {
    expect(createProductSlug('  Vaso Coração — Edição 2 ')).toBe('vaso-coracao-edicao-2');
  });
});
