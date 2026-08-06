import type { OrderStatus } from '@/types/database';

export const REVENUE_ORDER_STATUSES = [
  'approved',
  'paid',
  'processing',
  'completed',
  'shipped',
  'delivered',
] as const satisfies readonly OrderStatus[];

const REVENUE_ORDER_STATUS_SET = new Set<string>(REVENUE_ORDER_STATUSES);

export function isRevenueOrderStatus(status: unknown): status is (typeof REVENUE_ORDER_STATUSES)[number] {
  return typeof status === 'string' && REVENUE_ORDER_STATUS_SET.has(status);
}

export function summarizeRevenueOrders<T extends { status: unknown; total: number | null | undefined }>(orders: T[]) {
  const validOrders = orders.filter((order) => isRevenueOrderStatus(order.status));
  const totalRevenue = validOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  const totalOrders = validOrders.length;

  return {
    validOrders,
    totalRevenue,
    totalOrders,
    averageTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
  };
}
