import { describe, expect, it } from 'vitest';
import { mergeProductSEO, validateProductContent, type ProductContent } from './product-content';
import type { Product } from '@/types/database';

const content: ProductContent = { title: 'Lula articulada', description: 'Presente criativo', seo_title: 'Lula articulada 3D', seo_description: 'Conheça a lula articulada.', keywords: ['lula articulada'], image_alts: [{ index: 0, text: 'Lula roxa sobre mesa' }] };
const product = { name: 'Lula', image_url: '/capa', seo_title: null, seo_description: null } as Product;
describe('product content validation and SEO preservation', () => {
  it('bounds generated text and removes HTML', () => {
    const result = validateProductContent({ ...content, title: '<b>Lula</b>', seo_description: 'a'.repeat(200) }, 1);
    expect(result.title).toBe('Lula'); expect(result.seo_description).toHaveLength(150);
  });
  it.each([null, {}, { ...content, keywords: [12] }, { ...content, title: {} }, { ...content, image_alts: [{ index: 5, text: 'inventado' }] }, { ...content, image_alts: [] }])('rejects malformed or incomplete responses', value => {
    expect(() => validateProductContent(value, 1)).toThrow();
  });
  it('does not allow invented image descriptions without image input', () => {
    expect(() => validateProductContent(content, 0)).toThrow();
    expect(validateProductContent({ ...content, image_alts: [] }, 0).image_alts).toEqual([]);
  });
  it('fills missing fields without changing product identity, price or slug', () => {
    const result = mergeProductSEO(product, content, ['/capa']);
    expect(result).toMatchObject({ seo_title: content.seo_title, seo_description: content.seo_description, seo_keywords: content.keywords, image_alt_texts: { '/capa': content.image_alts[0].text } });
    expect(result).not.toHaveProperty('name'); expect(result).not.toHaveProperty('slug'); expect(result).not.toHaveProperty('base_price');
  });
  it('preserves every manual field on existing products', () => {
    const result = mergeProductSEO({ ...product, seo_title: 'Manual', seo_description: 'Minha descrição', seo_keywords: ['manual'], image_alt_texts: { '/capa': 'Meu alt' } }, content, ['/capa']);
    expect(result.seo_title).toBeUndefined(); expect(result.seo_description).toBeUndefined(); expect(result.seo_keywords).toBeUndefined();
    expect(result.image_alt_texts).toEqual({ '/capa': 'Meu alt' });
  });
  it('refreshes only unchanged AI fields; manual overrides win independently', () => {
    const previous = { seo_title: 'Antigo IA', seo_description: 'Antiga IA', seo_keywords: ['antigo'], image_alt_texts: { '/capa': 'Alt IA' } };
    const result = mergeProductSEO({ ...product, ...previous, seo_description: 'Agora manual', seo_ai_generated: previous }, content, ['/capa']);
    expect(result.seo_title).toBe(content.seo_title); expect(result.seo_description).toBeUndefined();
    expect(result.seo_keywords).toEqual(content.keywords); expect(result.image_alt_texts?.['/capa']).toBe(content.image_alts[0].text);
  });
  it('keys alt text by image URL so reordering cannot attach the wrong description', () => {
    const result = mergeProductSEO({ ...product, image_alt_texts: { '/old': 'Original manual' } }, content, ['/new']);
    expect(result.image_alt_texts).toEqual({ '/old': 'Original manual', '/new': content.image_alts[0].text });
  });
});
