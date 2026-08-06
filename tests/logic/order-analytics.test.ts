import { describe, expect, it } from 'vitest';
import { isRevenueOrderStatus, REVENUE_ORDER_STATUSES, summarizeRevenueOrders } from '@/lib/order-analytics';

describe('order analytics', () => {
  it('counts only orders with confirmed revenue', () => {
    const summary = summarizeRevenueOrders([
      { status: 'processing', total: 80 },
      { status: 'rejected', total: 120 },
      { status: 'awaiting_payment', total: 60 },
      { status: 'delivered', total: 40 },
      { status: 'refunded', total: 20 },
    ]);

    expect(summary.totalOrders).toBe(2);
    expect(summary.totalRevenue).toBe(120);
    expect(summary.averageTicket).toBe(60);
    expect(summary.validOrders.map((order) => order.status)).toEqual(['processing', 'delivered']);
  });

  it.each(['rejected', 'canceled', 'refunded', 'pending', 'awaiting_payment'])(
    'excludes %s from revenue',
    (status) => expect(isRevenueOrderStatus(status)).toBe(false),
  );

  it('keeps every successful checkout status in one shared list', () => {
    expect(REVENUE_ORDER_STATUSES).toEqual(['approved', 'paid', 'processing', 'completed', 'shipped', 'delivered']);
  });
});
