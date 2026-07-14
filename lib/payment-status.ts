import type { OrderStatus } from '@/types/database';

const APPROVED_PROVIDER_STATUSES = new Set(['approved', 'authorized']);

export function isMercadoPagoApproved(status: string | null | undefined) {
  return Boolean(status && APPROVED_PROVIDER_STATUSES.has(status));
}

export function mapMercadoPagoOrderStatus(
  providerStatus: string | null | undefined,
  digitalOnly: boolean,
  currentStatus: OrderStatus = 'awaiting_payment',
): OrderStatus {
  if (isMercadoPagoApproved(providerStatus)) return digitalOnly ? 'approved' : 'processing';
  if (providerStatus === 'cancelled') return 'canceled';
  if (providerStatus === 'refunded') return 'refunded';
  if (providerStatus === 'rejected' || providerStatus === 'declined') return 'rejected';
  if (providerStatus === 'pending' || providerStatus === 'in_process' || providerStatus === 'in_mediation') {
    return 'awaiting_payment';
  }
  return currentStatus;
}
