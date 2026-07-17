import { describe, expect, it } from 'vitest';
import { calculateCheckoutTotals } from '@/lib/checkout-rules';

describe('totais do checkout', () => {
  it('aplica 10% somente na primeira compra sem cupom', () => {
    expect(calculateCheckoutTotals({ subtotal: 100, shippingCost: 15, isFirstPurchase: true }))
      .toEqual({ subtotal: 100, couponDiscount: 0, firstPurchaseDiscount: 10, total: 105 });
  });

  it('acumula cupom com os 10% de primeira compra sem descontar o frete', () => {
    expect(calculateCheckoutTotals({ subtotal: 100, shippingCost: 15, isFirstPurchase: true, couponDiscountAmount: 20 }))
      .toEqual({ subtotal: 100, couponDiscount: 20, firstPurchaseDiscount: 10, total: 85 });
  });

  it('limita o cupom ao subtotal e nunca cria total negativo', () => {
    expect(calculateCheckoutTotals({ subtotal: 50, shippingCost: 0, isFirstPurchase: false, couponDiscountAmount: 80 }).total)
      .toBe(0);
  });

  it('arredonda o total monetário em centavos', () => {
    expect(calculateCheckoutTotals({ subtotal: 59.99, shippingCost: 10, isFirstPurchase: true }).total)
      .toBe(63.99);
  });

  it('limita cupom e primeira compra ao subtotal dos produtos', () => {
    expect(calculateCheckoutTotals({ subtotal: 50, shippingCost: 12, isFirstPurchase: true, couponDiscountAmount: 80 }))
      .toEqual({ subtotal: 50, couponDiscount: 45, firstPurchaseDiscount: 5, total: 12 });
  });
});
