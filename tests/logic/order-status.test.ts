import { describe, it, expect } from 'vitest';

type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'canceled' | 'refunded';

const VALID_STATUSES: OrderStatus[] = [
  'pending', 'paid', 'processing', 'shipped', 'delivered', 'canceled', 'refunded',
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  paid: 'Pagamento confirmado',
  processing: 'Em preparo',
  shipped: 'Enviado',
  delivered: 'Entregue',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
};

function isValidStatus(status: string): status is OrderStatus {
  return VALID_STATUSES.includes(status as OrderStatus);
}

function requiresTrackingCode(status: string): boolean {
  return status === 'shipped';
}

function getNotificationTitle(orderId: string, status: OrderStatus): string {
  const label = STATUS_LABELS[status] ?? status;
  return `Pedido #${orderId.slice(0, 8).toUpperCase()} — ${label}`;
}

describe('Order Status', () => {
  describe('isValidStatus', () => {
    it('should accept all valid statuses', () => {
      for (const status of VALID_STATUSES) {
        expect(isValidStatus(status)).toBe(true);
      }
    });

    it('should reject invalid statuses', () => {
      expect(isValidStatus('invalid')).toBe(false);
      expect(isValidStatus('')).toBe(false);
      expect(isValidStatus('SHIPPED')).toBe(false);
    });
  });

  describe('requiresTrackingCode', () => {
    it('should require tracking code only for shipped status', () => {
      expect(requiresTrackingCode('shipped')).toBe(true);
      expect(requiresTrackingCode('delivered')).toBe(false);
      expect(requiresTrackingCode('processing')).toBe(false);
      expect(requiresTrackingCode('pending')).toBe(false);
    });
  });

  describe('getNotificationTitle', () => {
    it('should format notification title with order ID and status label', () => {
      const title = getNotificationTitle('abc12345-6789-xxxx', 'shipped');
      expect(title).toBe('Pedido #ABC12345 — Enviado');
    });

    it('should format correctly for all statuses', () => {
      const orderId = 'deadbeef-1234';
      expect(getNotificationTitle(orderId, 'paid')).toBe('Pedido #DEADBEEF — Pagamento confirmado');
      expect(getNotificationTitle(orderId, 'delivered')).toBe('Pedido #DEADBEEF — Entregue');
      expect(getNotificationTitle(orderId, 'canceled')).toBe('Pedido #DEADBEEF — Cancelado');
    });
  });
});
