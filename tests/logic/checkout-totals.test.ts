import { describe, expect, it } from 'vitest';
import { calculateCheckoutTotals } from '@/lib/checkout-rules';

describe('totais do checkout', () => {
  it('aplica 10% somente na primeira compra sem cupom', () => {
    expect(calculateCheckoutTotals({ subtotal: 100, shippingCost: 15, isFirstPurchase: true, hasCoupon: false }))
      .toEqual({ subtotal: 100, couponDiscount: 0, firstPurchaseDiscount: 10, total: 105 });
  });

  it('não acumula cupom com desconto de primeira compra', () => {
    expect(calculateCheckoutTotals({ subtotal: 100, shippingCost: 15, isFirstPurchase: true, hasCoupon: true, couponDiscountAmount: 20 }))
      .toEqual({ subtotal: 100, couponDiscount: 20, firstPurchaseDiscount: 0, total: 95 });
  });

  it('limita o cupom ao subtotal e nunca cria total negativo', () => {
    expect(calculateCheckoutTotals({ subtotal: 50, shippingCost: 0, isFirstPurchase: false, hasCoupon: true, couponDiscountAmount: 80 }).total)
      .toBe(0);
  });

  it('arredonda o total monetário em centavos', () => {
    expect(calculateCheckoutTotals({ subtotal: 59.99, shippingCost: 10, isFirstPurchase: true, hasCoupon: false }).total)
      .toBe(63.99);
  });
});
