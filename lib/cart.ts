import type { Product, ProductOption } from '@/types/database';

export interface CartItemView {
  id: string;
  product_id: string;
  product_option_id: string | null;
  quantity: number;
  created_at?: string;
  product: Pick<
    Product,
    'id' | 'name' | 'base_price' | 'image_url' | 'category'
  >;
  option: Pick<
    ProductOption,
    'id' | 'name' | 'price_modifier' | 'stock' | 'color'
  > | null;
}

export interface AddItemInput {
  product: CartItemView['product'];
  option: CartItemView['option'];
  quantity: number;
}

export function computeUnitPrice(item: CartItemView): number {
  return item.product.base_price + (item.option?.price_modifier ?? 0);
}

export function computeItemTotal(item: CartItemView): number {
  return computeUnitPrice(item) * item.quantity;
}

export function computeCartTotal(items: CartItemView[]): number {
  return items.reduce((sum, item) => sum + computeItemTotal(item), 0);
}

export function computeCartCount(items: CartItemView[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function findExistingItem(
  items: CartItemView[],
  productId: string,
  productOptionId: string | null,
): CartItemView | undefined {
  return items.find(
    (item) =>
      item.product_id === productId &&
      item.product_option_id === productOptionId,
  );
}

export function clampQuantity(
  quantity: number,
  stock: number | undefined,
): number {
  const max = stock ?? 99;
  return Math.max(1, Math.min(max, Math.floor(quantity)));
}

export const LOCAL_CART_STORAGE_KEY = 'ecommerce-3d:cart';
