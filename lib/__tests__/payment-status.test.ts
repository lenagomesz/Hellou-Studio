import { describe, expect, it } from 'vitest';
import { isMercadoPagoApproved, mapMercadoPagoOrderStatus } from '@/lib/payment-status';

describe('regras de status do Mercado Pago', () => {
  it.each(['approved', 'authorized'])('considera %s como pagamento aprovado', (status) => {
    expect(isMercadoPagoApproved(status)).toBe(true);
    expect(mapMercadoPagoOrderStatus(status, false)).toBe('processing');
    expect(mapMercadoPagoOrderStatus(status, true)).toBe('approved');
  });

  it.each(['pending', 'in_process', 'in_mediation'])('mantém %s aguardando pagamento', (status) => {
    expect(isMercadoPagoApproved(status)).toBe(false);
    expect(mapMercadoPagoOrderStatus(status, false)).toBe('awaiting_payment');
  });

  it('separa pagamentos rejeitados, cancelados e reembolsados', () => {
    expect(mapMercadoPagoOrderStatus('rejected', false)).toBe('rejected');
    expect(mapMercadoPagoOrderStatus('cancelled', false)).toBe('canceled');
    expect(mapMercadoPagoOrderStatus('refunded', false)).toBe('refunded');
  });
});
