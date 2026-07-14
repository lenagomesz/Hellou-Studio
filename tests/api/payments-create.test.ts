import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks (hoisted so vi.mock factories can reference them) ---

const { mockPaymentCreate, mockUser } = vi.hoisted(() => ({
  mockPaymentCreate: vi.fn(),
  mockUser: { id: 'user-123', email: 'test@example.com', role: 'user' },
}));

vi.mock('@/lib/mercadopago', () => ({
  getPaymentClient: () => ({ create: mockPaymentCreate }),
}));

vi.mock('@/lib/api', () => ({
  requireUser: vi.fn().mockResolvedValue({ user: mockUser }),
  badRequest: (msg: string) => new Response(JSON.stringify({ error: msg }), { status: 400 }),
  serverError: (msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 }),
}));

vi.mock('@/lib/email', () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendAdminNewOrderEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/cpf', () => ({
  isValidCpf: (cpf: string) => cpf === '12345678909',
}));

vi.mock('@/lib/shipping', () => ({
  sanitizeCep: (value: string) => value.replace(/\D/g, '').length === 8 ? value.replace(/\D/g, '') : null,
  calculateShipping: vi.fn().mockResolvedValue({
    options: [{ id: 'pac', name: 'PAC', price: 10, days_min: 3, days_max: 5 }],
    address: { city: 'Itajaí', state: 'SC', street: '', neighborhood: '' },
  }),
}));

const mockRpc = vi.fn().mockResolvedValue({ error: null });
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();

function createBuilder(resolvedData: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: resolvedData, error: null });
  chain.single = vi.fn().mockResolvedValue({ data: resolvedData, error: null });
  return chain;
}

let cartBuilder: ReturnType<typeof createBuilder>;
let usersBuilder: ReturnType<typeof createBuilder>;
let ordersBuilder: ReturnType<typeof createBuilder>;
let orderItemsBuilder: ReturnType<typeof createBuilder>;
let couponsBuilder: ReturnType<typeof createBuilder>;
let cartDeleteBuilder: ReturnType<typeof createBuilder>;
let productOptionsBuilder: ReturnType<typeof createBuilder>;

const mockCartItems = [
  {
    id: 'ci-1',
    product_id: 'prod-1',
    product_option_id: 'opt-1',
    quantity: 2,
    product: { name: 'Chaveiro Dragão', base_price: 25, image_url: '/img.png' },
    option: { name: 'Azul', color: '#0000ff', price_modifier: 5, stock: 10 },
  },
];

function setupMockAdmin() {
  cartBuilder = createBuilder(null);
  cartBuilder.select = vi.fn().mockReturnValue(cartBuilder);
  cartBuilder.eq = vi.fn().mockReturnValue(cartBuilder);
  (cartBuilder as unknown as { then: (r: (v: unknown) => void) => void }).then = (resolve) =>
    resolve({ data: mockCartItems, error: null });

  usersBuilder = createBuilder({ name: 'Helena Gomes', email: 'helena@test.com' });
  ordersBuilder = createBuilder({ id: 'order-abc' });
  orderItemsBuilder = createBuilder(null);
  couponsBuilder = createBuilder(null);
  cartDeleteBuilder = createBuilder(null);
  productOptionsBuilder = createBuilder(null);
}

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      switch (table) {
        case 'cart_items': return cartBuilder;
        case 'users': return usersBuilder;
        case 'orders': return ordersBuilder;
        case 'order_items': return orderItemsBuilder;
        case 'coupons': return couponsBuilder;
        case 'product_options': return productOptionsBuilder;
        default: return cartDeleteBuilder;
      }
    },
    rpc: mockRpc,
  }),
}));

// --- Import route handler ---
import { POST } from '@/app/api/payments/mercadopago/create/route';

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/payments/mercadopago/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shipping_method: 'pac',
      shipping_cep: '88304000',
      shipping_address: { cep: '88304000' },
      ...body,
    }),
  });
}

// --- Tests ---

describe('POST /api/payments/mercadopago/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockAdmin();
  });

  describe('Validation', () => {
    it('rejects missing payment_method', async () => {
      const res = await POST(makeRequest({ cpf: '12345678909' }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Método de pagamento');
    });

    it('rejects credit_card without token', async () => {
      const res = await POST(makeRequest({ payment_method: 'credit_card', cpf: '12345678909' }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Token do cartão');
    });

    it('rejects invalid CPF', async () => {
      const res = await POST(makeRequest({ payment_method: 'pix', cpf: '00000000000' }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('CPF');
    });

    it('rejects missing CPF', async () => {
      const res = await POST(makeRequest({ payment_method: 'pix' }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('CPF');
    });
  });

  describe('PIX payment flow', () => {
    it('creates order with awaiting_payment status when PIX is pending', async () => {
      mockPaymentCreate.mockResolvedValue({
        id: 'mp-pay-123',
        status: 'pending',
        point_of_interaction: {
          transaction_data: {
            qr_code: 'pix-code-123',
            qr_code_base64: 'base64data',
          },
        },
        date_of_expiration: '2026-06-12T23:59:59Z',
      });

      const res = await POST(makeRequest({ payment_method: 'pix', cpf: '12345678909' }));
      const json = await res.json();

      expect(json.status).toBe('pending');
      expect(json.pix_qr_code).toBe('pix-code-123');
      expect(json.pix_qr_code_base64).toBe('base64data');
      expect(json.order_id).toBe('order-abc');

      // Verify order was inserted with awaiting_payment
      expect(ordersBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'awaiting_payment' }),
      );
    });

    it('does NOT fulfill order (no stock decrement, no cart clear) for pending PIX', async () => {
      mockPaymentCreate.mockResolvedValue({
        id: 'mp-pay-456',
        status: 'pending',
        point_of_interaction: { transaction_data: { qr_code: 'x', qr_code_base64: 'y' } },
      });

      await POST(makeRequest({ payment_method: 'pix', cpf: '12345678909' }));

      expect(mockRpc).not.toHaveBeenCalledWith('decrement_stock', expect.anything());
    });
  });

  describe('Credit card payment flow', () => {
    it('creates order em processamento when card is approved immediately', async () => {
      mockPaymentCreate.mockResolvedValue({
        id: 'mp-pay-789',
        status: 'approved',
      });

      const res = await POST(makeRequest({
        payment_method: 'credit_card',
        token: 'tok_abc123',
        installments: 3,
        cpf: '12345678909',
      }));
      const json = await res.json();

      expect(json.status).toBe('approved');
      expect(json.order_id).toBe('order-abc');

      // Pagamento aprovado de produto físico entra na fila de produção.
      expect(ordersBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'processing' }),
      );
    });

    it('fulfills order when card is approved (stock, cart, emails)', async () => {
      mockPaymentCreate.mockResolvedValue({
        id: 'mp-pay-789',
        status: 'approved',
      });

      await POST(makeRequest({
        payment_method: 'credit_card',
        token: 'tok_abc',
        cpf: '12345678909',
      }));

      // Stock decrement should be called
      expect(mockRpc).toHaveBeenCalledWith('decrement_stock', {
        option_id: 'opt-1',
        qty: 2,
      });

      // Emails should be sent
      const { sendOrderConfirmationEmail, sendAdminNewOrderEmail } = await import('@/lib/email');
      expect(sendOrderConfirmationEmail).toHaveBeenCalled();
      expect(sendAdminNewOrderEmail).toHaveBeenCalled();
    });

    it('creates order with awaiting_payment when card is rejected', async () => {
      mockPaymentCreate.mockResolvedValue({
        id: 'mp-pay-rej',
        status: 'rejected',
        status_detail: 'cc_rejected_insufficient_amount',
      });

      const res = await POST(makeRequest({
        payment_method: 'credit_card',
        token: 'tok_rej',
        cpf: '12345678909',
      }));
      const json = await res.json();

      expect(json.status).toBe('rejected');
      expect(json.status_detail).toBe('cc_rejected_insufficient_amount');

      expect(ordersBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'awaiting_payment' }),
      );
    });

    it('passes installments and issuer_id to MP for credit card', async () => {
      mockPaymentCreate.mockResolvedValue({ id: 'mp-1', status: 'approved' });

      await POST(makeRequest({
        payment_method: 'credit_card',
        token: 'tok_123',
        installments: 3,
        issuer_id: 'issuer-456',
        cpf: '12345678909',
      }));

      expect(mockPaymentCreate).toHaveBeenCalledWith({
        body: expect.objectContaining({
          token: 'tok_123',
          installments: 3,
          issuer_id: 'issuer-456',
        }),
      });
    });
  });

  describe('Coupon handling', () => {
    it('applies percentage coupon discount', async () => {
      // Setup coupon
      couponsBuilder.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'coupon-1', code: 'SAVE10', discount_type: 'percent', discount_value: 10, min_purchase: 0, max_uses: null, used_count: 0, free_shipping: false, active: true },
        error: null,
      });

      mockPaymentCreate.mockResolvedValue({ id: 'mp-c1', status: 'approved' });

      await POST(makeRequest({
        payment_method: 'credit_card',
        token: 'tok_c',
        cpf: '12345678909',
        coupon_code: 'SAVE10',
      }));

      // Cupom substitui a primeira compra: R$60 - 10% + R$10 de frete validado.
      expect(mockPaymentCreate).toHaveBeenCalledWith({
        body: expect.objectContaining({
          transaction_amount: 64,
        }),
      });
    });
  });

  describe('Error handling', () => {
    it('returns 500 when MP payment creation throws', async () => {
      mockPaymentCreate.mockRejectedValue(new Error('MP API down'));

      const res = await POST(makeRequest({ payment_method: 'pix', cpf: '12345678909' }));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain('MP API down');
    });
  });
});
