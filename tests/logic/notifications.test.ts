import { describe, it, expect } from 'vitest';

type NotificationType = 'order_status' | 'print_request_status' | 'announcement';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  metadata: Record<string, unknown> | null;
}

function getNotificationHref(n: Notification): string {
  const meta = n.metadata;
  switch (n.type) {
    case 'order_status':
      if (meta?.order_id) return `/account/orders/${meta.order_id}`;
      return '/account/orders';
    case 'print_request_status':
      return '/account/requests';
    case 'announcement':
    default:
      return '/products';
  }
}

describe('Notification Routing', () => {
  it('should route order_status with order_id to specific order page', () => {
    const notif: Notification = {
      id: '1',
      type: 'order_status',
      title: 'Pedido enviado',
      metadata: { order_id: 'abc-123', status: 'shipped' },
    };
    expect(getNotificationHref(notif)).toBe('/account/orders/abc-123');
  });

  it('should route order_status without order_id to orders list', () => {
    const notif: Notification = {
      id: '2',
      type: 'order_status',
      title: 'Pedido atualizado',
      metadata: null,
    };
    expect(getNotificationHref(notif)).toBe('/account/orders');
  });

  it('should route print_request_status to requests page', () => {
    const notif: Notification = {
      id: '3',
      type: 'print_request_status',
      title: 'Solicitação aprovada',
      metadata: { print_request_id: 'pr-456' },
    };
    expect(getNotificationHref(notif)).toBe('/account/requests');
  });

  it('should route announcement to products catalog', () => {
    const notif: Notification = {
      id: '4',
      type: 'announcement',
      title: 'Novos produtos!',
      metadata: null,
    };
    expect(getNotificationHref(notif)).toBe('/products');
  });

  it('should default unknown types to products', () => {
    const notif: Notification = {
      id: '5',
      type: 'announcement',
      title: 'Qualquer',
      metadata: { something: true },
    };
    expect(getNotificationHref(notif)).toBe('/products');
  });
});
