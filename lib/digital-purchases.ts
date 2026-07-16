import type { SupabaseClient } from '@supabase/supabase-js';
import { SUCCESSFUL_ORDER_STATUSES } from '@/lib/checkout-rules';

export async function findOwnedDigitalProducts(
  admin: SupabaseClient,
  userId: string,
  productIds: string[],
): Promise<Map<string, string>> {
  const uniqueProductIds = Array.from(new Set(productIds.filter(Boolean)));
  if (uniqueProductIds.length === 0) return new Map();

  const { data: orders, error: ordersError } = await admin
    .from('orders')
    .select('id')
    .eq('user_id', userId)
    .in('status', [...SUCCESSFUL_ORDER_STATUSES]);

  if (ordersError) throw ordersError;
  const orderIds = (orders ?? []).map((order) => order.id);
  if (orderIds.length === 0) return new Map();

  const { data: items, error: itemsError } = await admin
    .from('order_items')
    .select('order_id, product_id')
    .in('order_id', orderIds)
    .in('product_id', uniqueProductIds);

  if (itemsError) throw itemsError;
  return new Map((items ?? []).map((item) => [item.product_id, item.order_id]));
}
