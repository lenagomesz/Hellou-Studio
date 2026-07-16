import { describe, expect, it } from 'vitest';
import {
  clampQuantity,
  computeCartTotal,
  computeUnitPrice,
  getCartStockLimit,
  type CartItemView,
} from '@/lib/cart';

function cartItem(salePrice: number | null): CartItemView {
  return {
    id: 'cart-1',
    product_id: 'product-1',
    product_option_id: 'option-1',
    quantity: 2,
    customization_text: null,
    product: {
      id: 'product-1',
      name: 'Produto em promoção',
      base_price: 25,
      sale_price: salePrice,
      image_url: null,
      category: 'chaveiros',
      type: 'physical',
      fulfillment_mode: 'made_to_order',
    },
    option: {
      id: 'option-1',
      name: 'Azul',
      price_modifier: 5,
      stock: 10,
      color: '#0000ff',
    },
  };
}

describe('preços do carrinho', () => {
  it('usa o preço promocional antes do modificador da variação', () => {
    const item = cartItem(20);
    expect(computeUnitPrice(item)).toBe(25);
    expect(computeCartTotal([item])).toBe(50);
  });

  it('usa o preço base quando não há promoção', () => {
    const item = cartItem(null);
    expect(computeUnitPrice(item)).toBe(30);
    expect(computeCartTotal([item])).toBe(60);
  });
});

describe('quantidade no carrinho', () => {
  it('não limita produto sob encomenda pelo estoque da variação', () => {
    const item = cartItem(null);
    item.option!.stock = 0;

    const limit = getCartStockLimit(item.product, item.option);

    expect(limit).toBeUndefined();
    expect(clampQuantity(5, limit)).toBe(5);
  });

  it('limita produto de pronta-entrega pelo estoque da variação', () => {
    const item = cartItem(null);
    item.product.fulfillment_mode = 'ready_stock';
    item.option!.stock = 3;

    const limit = getCartStockLimit(item.product, item.option);

    expect(limit).toBe(3);
    expect(clampQuantity(5, limit)).toBe(3);
  });
});
