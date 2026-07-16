import type { Product, ProductOption } from '@/types/database';

export interface CartItemView {
  id: string;
  product_id: string;
  product_option_id: string | null;
  quantity: number;
  customization_text: string | null;
  created_at?: string;
  product: Pick<
    Product,
    'id' | 'name' | 'base_price' | 'sale_price' | 'image_url' | 'category' | 'type'
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
  customization_text?: string | null;
}

export function computeUnitPrice(item: CartItemView): number {
  return (item.product.sale_price ?? item.product.base_price) + (item.option?.price_modifier ?? 0);
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
  customizationText: string | null = null,
): CartItemView | undefined {
  return items.find(
    (item) =>
      item.product_id === productId &&
      item.product_option_id === productOptionId &&
      (item.customization_text ?? null) === customizationText,
  );
}

export function clampQuantity(
  quantity: number,
  stock: number | undefined,
): number {
  const max = Math.min(stock ?? 50, 50);
  return Math.max(1, Math.min(max, Math.floor(quantity)));
}

export function validateCartProductTypes(items: Array<{ product: { type: string } }>) {
  const types = new Set(items.map(item => item.product.type));
  if (types.size > 1) {
    throw new Error('Não é possível misturar produtos digitais e físicos no mesmo carrinho. Finalize a compra de um tipo antes de adicionar o outro.');
  }
}

export const LOCAL_CART_STORAGE_KEY = 'ecommerce-3d:cart';
