import { describe, expect, it } from 'vitest';
import { calculateRecoveryTotal, cartSignature } from '@/lib/cart-recovery';

describe('cart recovery rules', () => {
  it('calculates the current sale price with option modifiers', () => {
    expect(calculateRecoveryTotal([
      { quantity: 2, basePrice: 30, salePrice: 25, priceModifier: 5 },
      { quantity: 1, basePrice: 10 },
    ])).toBe(70);
  });

  it('creates the same signature regardless of database row order', () => {
    const first = { id: 'a', user_id: 'u', product_id: 'p', product_option_id: null, quantity: 1, updated_at: '2026-07-14T10:00:00.000Z' };
    const second = { id: 'b', user_id: 'u', product_id: 'p2', product_option_id: null, quantity: 2, updated_at: '2026-07-14T10:01:00.000Z' };
    expect(cartSignature([first, second])).toBe(cartSignature([second, first]));
  });

  it('changes the signature when quantity or update time changes', () => {
    const item = { id: 'a', user_id: 'u', product_id: 'p', product_option_id: null, quantity: 1, updated_at: '2026-07-14T10:00:00.000Z' };
    expect(cartSignature([item])).not.toBe(cartSignature([{ ...item, quantity: 2 }]));
  });
});
