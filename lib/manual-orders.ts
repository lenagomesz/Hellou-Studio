import type { ManualOrderPaymentStatus, ManualOrderStatus } from '@/types/database';

export const MANUAL_ORDER_STATUSES: ManualOrderStatus[] = [
  'pending', 'confirmed', 'in_production', 'ready', 'delivered', 'canceled',
];

export const MANUAL_ORDER_PAYMENT_STATUSES: ManualOrderPaymentStatus[] = ['pending', 'paid'];

export const MANUAL_ORDER_STATUS_LABELS: Record<ManualOrderStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  in_production: 'Em produção',
  ready: 'Pronta para entrega',
  delivered: 'Entregue',
  canceled: 'Cancelada',
};

export const MANUAL_ORDER_PAYMENT_LABELS: Record<ManualOrderPaymentStatus, string> = {
  pending: 'Pagamento pendente',
  paid: 'Pago',
};

export const MANUAL_ORDER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeManualOrderEmail(email: string) {
  return email.trim().toLowerCase();
}
