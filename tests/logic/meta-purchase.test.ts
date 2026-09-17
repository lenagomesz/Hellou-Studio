import { describe, expect, it } from 'vitest';
import { confirmedMetaPurchase } from '@/lib/meta-purchase';

const order = {
  status: 'processing',
  mp_status: 'approved',
  total: 79.9,
  items: [
    { product_id: 'product-1', quantity: 2 },
    { product_id: 'product-2', quantity: 1 },
    { product_id: 'product-1', quantity: 1 },
  ],
};

describe('Purchase da Meta', () => {
  it('usa o valor final e as quantidades persistidas do pedido aprovado', () => {
    expect(confirmedMetaPurchase(order)).toEqual({
      confirmed: true,
      value: 79.9,
      currency: 'BRL',
      content_ids: ['product-1', 'product-2'],
      content_type: 'product',
      num_items: 4,
    });
  });

  it.each([
    { status: 'awaiting_payment', mp_status: 'pending' },
    { status: 'rejected', mp_status: 'rejected' },
    { status: 'awaiting_payment', mp_status: 'approved' },
    { status: 'processing', mp_status: 'pending' },
  ])('não confirma pedido sem pagamento aprovado: %j', (state) => {
    expect(confirmedMetaPurchase({ ...order, ...state })).toBeNull();
  });
});
