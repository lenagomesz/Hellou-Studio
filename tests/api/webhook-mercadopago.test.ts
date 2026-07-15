// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';

// --- Mocks ---

const mockPaymentGet = vi.fn();
const originalWebhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

vi.mock('@/lib/mercadopago', () => ({
  getPaymentClient: () => ({ get: mockPaymentGet }),
}));

vi.mock('@/lib/email', () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendInvoiceRequestEmail: vi.fn().mockResolvedValue(undefined),
  sendAdminNewOrderEmail: vi.fn().mockResolvedValue(undefined),
  sendSTLOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendSTLAdminNotificationEmail: vi.fn().mockResolvedValue(undefined),
}));

const mockRpc = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn();
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });

let mockOrder: { id: string; status: string; user_id: string } | null = null;
let mockOrderItems: Array<Record<string, unknown>> | null = null;
let mockUserData: { email: string; name: string } | null = null;

function createChain(resolvedData: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: resolvedData, error: null });
  chain.single = vi.fn().mockResolvedValue({ data: resolvedData, error: null });
  return chain;
}

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'orders') {
        const chain = createChain(mockOrder);
        chain.update = vi.fn().mockImplementation(() => {
          mockUpdate();
          return { eq: mockUpdateEq };
        });
        return chain;
      }
      if (table === 'order_items') {
        return createChain(mockOrderItems);
      }
      if (table === 'users') {
        return createChain(mockUserData);
      }
      if (table === 'product_options') {
        const chain = createChain(null);
        chain.update = vi.fn().mockReturnValue(chain);
        return chain;
      }
      if (table === 'cart_items') {
        const chain = createChain(null);
        chain.delete = vi.fn().mockReturnValue(chain);
        return chain;
      }
      return createChain(null);
    },
    rpc: mockRpc,
  }),
}));

// --- Import route handler ---
import { POST } from '@/app/api/webhooks/mercadopago/route';

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/webhooks/mercadopago', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// --- Tests ---

describe('POST /api/webhooks/mercadopago', () => {
  beforeAll(() => {
    vi.stubEnv('NODE_ENV', 'test');
  });

  beforeEach(() => {
    delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    vi.clearAllMocks();
    mockOrder = { id: 'order-1', status: 'awaiting_payment', user_id: 'user-1' };
    mockOrderItems = [
      {
        product_option_id: 'opt-1',
        quantity: 2,
        unit_price: 30,
        product_snapshot: { name: 'Chaveiro' },
        option: { stock: 10 },
      },
    ];
    mockUserData = { email: 'client@test.com', name: 'Cliente Teste' };
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    if (originalWebhookSecret) process.env.MERCADO_PAGO_WEBHOOK_SECRET = originalWebhookSecret;
    else delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  });

  describe('Event filtering', () => {
    it('ignores non-payment events', async () => {
      const res = await POST(makeRequest({ type: 'plan', action: 'plan.created', data: {} }));
      const json = await res.json();
      expect(json.received).toBe(true);
      expect(mockPaymentGet).not.toHaveBeenCalled();
    });

    it('processes payment.created notifications', async () => {
      mockPaymentGet.mockResolvedValue({ status: 'pending' });
      const res = await POST(makeRequest({ type: 'payment', action: 'payment.created', data: { id: '123' } }));
      const json = await res.json();
      expect(json.received).toBe(true);
      expect(mockPaymentGet).toHaveBeenCalledWith({ id: '123' });
    });

    it('returns 400 for missing payment ID', async () => {
      const res = await POST(makeRequest({ type: 'payment', action: 'payment.updated', data: {} }));
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid JSON', async () => {
      const req = new Request('http://localhost/api/webhooks/mercadopago', {
        method: 'POST',
        body: 'not-json',
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe('PIX approved → awaiting_payment to processing', () => {
    it('updates a physical order to processing when PIX is approved', async () => {
      mockPaymentGet.mockResolvedValue({
        status: 'approved',
        transaction_amount: 60,
        metadata: { coupon_id: null },
      });

      const res = await POST(makeRequest({
        type: 'payment',
        action: 'payment.updated',
        data: { id: 'pay-123' },
      }));
      const json = await res.json();

      expect(json.status).toBe('processing');
      expect(mockRpc).toHaveBeenCalledWith('finalize_checkout_order', expect.objectContaining({
        p_order_status: 'processing',
        p_consume_inventory: true,
      }));
    });

    it('fulfills order: clears cart and sends email', async () => {
      mockPaymentGet.mockResolvedValue({
        status: 'approved',
        transaction_amount: 60,
        metadata: {},
      });

      await POST(makeRequest({
        type: 'payment',
        action: 'payment.updated',
        data: { id: 'pay-456' },
      }));

      const { sendOrderConfirmationEmail } = await import('@/lib/email');
      expect(sendOrderConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'client@test.com',
          pedidoId: 'order-1',
        }),
      );
    });

    it('increments coupon usage if coupon was used', async () => {
      mockPaymentGet.mockResolvedValue({
        status: 'approved',
        transaction_amount: 54,
        metadata: { coupon_id: 'coupon-xyz' },
      });

      await POST(makeRequest({
        type: 'payment',
        action: 'payment.updated',
        data: { id: 'pay-coupon' },
      }));

      expect(mockRpc).toHaveBeenCalledWith('increment_coupon_usage', { coupon_id: 'coupon-xyz' });
    });
  });

  describe('PIX cancelled', () => {
    it('updates order status to cancelled', async () => {
      mockPaymentGet.mockResolvedValue({
        status: 'cancelled',
        metadata: {},
      });

      const res = await POST(makeRequest({
        type: 'payment',
        action: 'payment.updated',
        data: { id: 'pay-cancel' },
      }));
      const json = await res.json();

      expect(json.status).toBe('canceled');
      expect(mockRpc).toHaveBeenCalledWith('finalize_checkout_order', expect.objectContaining({
        p_order_status: 'canceled',
        p_consume_inventory: false,
      }));
    });

    it('does NOT fulfill order when cancelled', async () => {
      mockPaymentGet.mockResolvedValue({
        status: 'cancelled',
        metadata: {},
      });

      await POST(makeRequest({
        type: 'payment',
        action: 'payment.updated',
        data: { id: 'pay-cancel2' },
      }));

      const { sendOrderConfirmationEmail } = await import('@/lib/email');
      expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
      expect(mockRpc).toHaveBeenCalledWith('finalize_checkout_order', expect.objectContaining({
        p_consume_inventory: false,
      }));
      expect(mockRpc).not.toHaveBeenCalledWith('increment_coupon_usage', expect.anything());
    });
  });

  describe('No-op scenarios', () => {
    it('does nothing when order not found', async () => {
      mockOrder = null;
      mockPaymentGet.mockResolvedValue({ status: 'approved', metadata: {} });

      const res = await POST(makeRequest({
        type: 'payment',
        action: 'payment.updated',
        data: { id: 'pay-orphan' },
      }));
      const json = await res.json();

      expect(json.received).toBe(true);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('does nothing when status has not changed', async () => {
      mockOrder = { id: 'order-1', status: 'processing', user_id: 'user-1' };
      mockPaymentGet.mockResolvedValue({ status: 'approved', metadata: {} });

      const res = await POST(makeRequest({
        type: 'payment',
        action: 'payment.updated',
        data: { id: 'pay-same' },
      }));
      const json = await res.json();

      // approved maps to processing, e o pedido já está nesse estado.
      expect(json.received).toBe(true);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('keeps an in_process physical payment awaiting confirmation', async () => {
      mockPaymentGet.mockResolvedValue({ status: 'in_process', metadata: {} });

      const res = await POST(makeRequest({
        type: 'payment',
        action: 'payment.updated',
        data: { id: 'pay-process' },
      }));
      const json = await res.json();

      expect(json.received).toBe(true);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('rejects an invalid webhook signature', async () => {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'secret';
      try {
        const request = new Request('http://localhost/api/webhooks/mercadopago', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': 'ts=1,v1=invalid',
            'x-request-id': 'request-1',
          },
          body: JSON.stringify({ type: 'payment', action: 'payment.updated', data: { id: 'pay-1' } }),
        });
        const response = await POST(request);
        expect(response.status).toBe(401);
        expect(mockPaymentGet).not.toHaveBeenCalled();
      } finally {
        delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
      }
    });
  });

  describe('Error handling', () => {
    it('returns 500 when MP API throws', async () => {
      mockPaymentGet.mockRejectedValue(new Error('MP down'));

      const res = await POST(makeRequest({
        type: 'payment',
        action: 'payment.updated',
        data: { id: 'pay-err' },
      }));
      expect(res.status).toBe(500);
    });
  });
});
