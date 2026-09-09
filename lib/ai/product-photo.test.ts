import { describe, expect, it } from 'vitest';
import { buildProductPhotoPrompt, geminiImageResponseFormat, isProductPhotoAngle, productGallery } from './product-photo';

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

  it('converts UI labels to the enum names required by the REST API', () => {
    expect(geminiImageResponseFormat('1:1', '2K')).toEqual({
      image: {
        aspectRatio: 'ASPECT_RATIO_ONE_BY_ONE',
        imageSize: 'IMAGE_SIZE_TWO_K',
      },
    });
    expect(geminiImageResponseFormat('4:5', '4K').image).toEqual({
      aspectRatio: 'ASPECT_RATIO_FOUR_BY_FIVE',
      imageSize: 'IMAGE_SIZE_FOUR_K',
    });
  });
});
