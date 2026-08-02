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
    'id' | 'name' | 'base_price' | 'sale_price' | 'image_url' | 'category' | 'type' | 'fulfillment_mode' | 'is_wholesale' | 'minimum_order_quantity'
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
  minimum = 1,
): number {
  const max = stock ?? 50;
  return Math.max(minimum, Math.min(max, Math.floor(quantity)));
}

export function getCartMinimumQuantity(
  product: Pick<Product, 'is_wholesale' | 'minimum_order_quantity'>,
): number {
  return product.is_wholesale ? Math.max(2, product.minimum_order_quantity ?? 2) : 1;
}

export function isCartQuantityAllowed(
  product: Pick<Product, 'is_wholesale' | 'minimum_order_quantity'>,
  quantity: number,
): boolean {
  if (!Number.isInteger(quantity) || quantity < 1) return false;
  if (!product.is_wholesale) return true;
  return quantity === 1 || quantity >= getCartMinimumQuantity(product);
}

export function normalizeCartQuantity(
  quantity: number,
  stock: number | undefined,
  product: Pick<Product, 'is_wholesale' | 'minimum_order_quantity'>,
): number {
  const max = stock ?? (product.is_wholesale ? 1000 : 50);
  const normalized = Math.max(1, Math.min(max, Math.floor(quantity)));
  if (!product.is_wholesale || normalized === 1 || normalized >= getCartMinimumQuantity(product)) return normalized;
  return getCartMinimumQuantity(product) <= max ? getCartMinimumQuantity(product) : 1;
}

export function getCartStockLimit(
  product: Pick<Product, 'fulfillment_mode' | 'is_wholesale'>,
  option: Pick<ProductOption, 'stock'> | null,
): number | undefined {
  if (product.fulfillment_mode === 'ready_stock') return option?.stock;
  return product.is_wholesale ? 1000 : undefined;
}

export function validateCartProductTypes(items: Array<{ product: { type: string } }>) {
  const types = new Set(items.map(item => item.product.type));
  if (types.size > 1) {
    throw new Error('Não é possível misturar produtos digitais e físicos no mesmo carrinho. Finalize a compra de um tipo antes de adicionar o outro.');
  }
}

export const LOCAL_CART_STORAGE_KEY = 'ecommerce-3d:cart';
