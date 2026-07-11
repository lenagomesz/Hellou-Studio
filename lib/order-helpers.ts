// lib/order-helpers.ts

export interface OrderItemWithProduct {
  product?: { type?: string | null } | null;
  [key: string]: unknown;
}

export function isDigitalOnly(items: OrderItemWithProduct[]): boolean {
  return items.length > 0 && items.every((item) => item.product?.type === 'digital');
}

export function hasDigitalItems(items: OrderItemWithProduct[]): boolean {
  return items.some((item) => item.product?.type === 'digital');
}

export function hasPhysicalItems(items: OrderItemWithProduct[]): boolean {
  return items.some((item) => item.product?.type !== 'digital');
}
