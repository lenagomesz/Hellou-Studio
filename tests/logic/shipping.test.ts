import { describe, expect, it } from 'vitest';
import { applyPromotionalShippingPolicy, PROMOTIONAL_PAC_MAX, type ShippingOption } from '@/lib/shipping';

const options: ShippingOption[] = [
  { id: 'pac', name: 'PAC', price: 27.40, days_min: 5, days_max: 8 },
  { id: 'sedex', name: 'SEDEX', price: 38.90, days_min: 2, days_max: 3 },
];

describe('promotional shipping policy', () => {
  it.each(['SC', 'PR', 'RS', 'SP', 'RJ', 'MG', 'ES', 'GO', 'MT', 'MS', 'DF'])(
    'limits PAC to less than R$ 20 for %s',
    (uf) => {
      const result = applyPromotionalShippingPolicy(uf, options);
      expect(result.find((option) => option.id === 'pac')?.price).toBe(PROMOTIONAL_PAC_MAX);
      expect(result.find((option) => option.id === 'sedex')?.price).toBe(38.90);
    },
  );

  it.each(['BA', 'PE', 'CE', 'AM', 'PA', 'TO'])(
    'keeps the calculated price for North and Northeast in %s',
    (uf) => {
      expect(applyPromotionalShippingPolicy(uf, options)).toEqual(options);
    },
  );

  it('does not increase an already cheaper PAC price', () => {
    const cheaper = [{ ...options[0], price: 9.90 }, options[1]];
    expect(applyPromotionalShippingPolicy('SC', cheaper)[0].price).toBe(9.90);
  });
});
