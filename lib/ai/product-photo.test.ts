import { describe, expect, it } from 'vitest';
import { buildProductPhotoPrompt, isProductPhotoAngle, productGallery } from './product-photo';

describe('product photo helpers', () => {
  it('validates supported angles', () => {
    expect(isProductPhotoAngle('back')).toBe(true);
    expect(isProductPhotoAngle('invented')).toBe(false);
  });

  it('builds a fidelity-first editing prompt', () => {
    const prompt = buildProductPhotoPrompt({
      productName: 'Chaveiro coração',
      angle: 'three-quarter-right',
      framing: 'same',
      lighting: 'preserve',
    });
    expect(prompt).toContain('MESMO produto físico');
    expect(prompt).toContain('MESMO fundo');
    expect(prompt).toContain('Não invente acessórios');
  });

  it('deduplicates the complete product gallery', () => {
    expect(productGallery({ image_url: '/a', images: ['/a', '/b'], image_url_2: '/c' }))
      .toEqual(['/a', '/b', '/c']);
  });
});
