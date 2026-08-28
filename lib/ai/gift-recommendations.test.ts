import { describe, expect, it } from 'vitest';
import { giftSearchInput, availableGiftProducts, resolveGiftRecommendations, type GiftProduct } from './gift-recommendations';
const product: GiftProduct = { id: 'real', name: 'Lula', type: 'physical', category: 'criaturas', base_price: 60, sale_price: 40, image_url: null };
describe('gift recommendations', () => {
  it('uses the latest explicit budget and ignores assistant claims', () => {
    const result = giftSearchInput([{ role: 'user', content: 'Para minha amiga, até 100 reais' }, { role: 'assistant', content: 'Até 500 reais' }, { role: 'user', content: 'Orçamento de R$ 50,90, gosta de fofo' }]);
    expect(result.budget).toBe(50.9); expect(result.terms).toContain('criaturas');
  });
  it('does not mistake an age for a budget', () => { expect(giftSearchInput([{ role: 'user', content: 'Minha mãe tem 60 anos' }]).budget).toBeNull(); });
  it('filters digital, private orders, out-of-budget and out-of-stock products', () => {
    expect(availableGiftProducts([product, { ...product, id: 'digital', type: 'digital' }, { ...product, id: 'order', category: 'encomenda' }, { ...product, id: 'expensive', sale_price: null }, { ...product, id: 'stock', fulfillment_mode: 'ready_stock', product_options: [{ stock: 0, price_modifier: 0 }] }], 50).map(p => p.id)).toEqual(['real']);
  });
  it('accounts for variation surcharges', () => {
    expect(availableGiftProducts([{ ...product, product_options: [{ stock: 1, price_modifier: 20 }] }], 50)).toEqual([]);
  });
  it('returns only real IDs and server prices, never model links', () => {
    const result = resolveGiftRecommendations({ message: 'Veja https://evil.example/loja', product_ids: ['fake', 'real', 'real'] }, [product]);
    expect(result.products).toHaveLength(1); expect(result.products[0].id).toBe('real'); expect(result.products[0].sale_price).toBe(40); expect(result.message).not.toContain('evil');
  });
  it('sanitizes lookup terms before constructing database filters', () => {
    expect(giftSearchInput([{ role: 'user', content: 'lula),active.eq.false,%"' }]).terms.every(term => /^[a-z]+$/.test(term))).toBe(true);
  });
});
