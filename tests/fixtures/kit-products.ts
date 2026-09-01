import type { KitProduct } from '@/lib/product-kits';
import type { ProductOption } from '@/types/database';

export function kitOption(overrides: Partial<ProductOption> = {}): ProductOption {
  return { id: 'option-1', product_id: 'product-1', name: 'Rosa', price_modifier: 0, stock: 10,
    reorder_point: 0, standard_order_qty: 1, dimensions: null, notes: null, color: '#ec4899',
    color_name: 'Rosa', image_url: null, sort_order: 0, active: true, created_at: '2026-01-01', ...overrides };
}

export function kitProduct(name: string, base_price: number, overrides: Partial<KitProduct> = {}): KitProduct {
  return { id: name, name, base_price, sale_price: null, category: 'escritorio', type: 'physical',
    description: null, image_url: null, image_url_2: null, images: [], active: true, file_path: null,
    created_at: '2026-01-01', updated_at: '2026-01-01', fulfillment_mode: 'made_to_order',
    product_options: [], ...overrides };
}

export const setupProducts = () => [
  kitProduct('Suporte Headset 3 em 1', 45.9),
  kitProduct('Mini Fidget Espiral', 29.9),
  kitProduct('Chaveiro Clicker', 20.9),
];
