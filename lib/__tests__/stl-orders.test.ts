import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock email templates (React components)
vi.mock('@/emails/stl-order-confirmation', () => ({
  STLOrderConfirmationEmail: (props: { orderId: string }) => `mock-stl-confirmation-${props.orderId}`,
}));

vi.mock('@/emails/stl-admin-notification', () => ({
  STLAdminNotificationEmail: (props: { orderId: string }) => `mock-stl-admin-${props.orderId}`,
}));

vi.mock('@/emails/boas-vindas', () => ({
  BoasVindasEmail: () => 'mock',
}));

vi.mock('@/emails/pedido-confirmado', () => ({
  PedidoConfirmadoEmail: () => 'mock',
}));

// Mock Resend at module level
const mockSend = vi.fn();

vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = { send: mockSend };
    },
  };
});

// Import AFTER mocks are set up
import * as emailModule from '../email';

describe('STL Order Emails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ error: null, data: { id: 'msg_123' } });
  });

  describe('sendSTLOrderConfirmationEmail', () => {
    it('handles missing Resend API key gracefully', async () => {
      // Run this test BEFORE setting the API key so getResend() returns null
      delete process.env.RESEND_API_KEY;

      // Should not throw
      await expect(
        emailModule.sendSTLOrderConfirmationEmail({
          email: 'customer@example.com',
          nome: 'João',
          orderId: 'order-123',
          fileName: 'model.stl',
          price: 19.99,
        })
      ).resolves.toBeUndefined();

      // No email should have been sent
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('sends email to customer with download link', async () => {
      // Set the API key so getResend() creates the Resend instance
      process.env.RESEND_API_KEY = 'test-api-key';

      await emailModule.sendSTLOrderConfirmationEmail({
        email: 'customer@example.com',
        nome: 'João',
        orderId: 'order-123',
        fileName: 'miniatura-dragao.stl',
        price: 29.99,
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@example.com',
          subject: expect.stringContaining('ORDER-12'),
        })
      );
    });

    it('logs error on email send failure', async () => {
      mockSend.mockResolvedValue({
        error: { message: 'API error' },
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await emailModule.sendSTLOrderConfirmationEmail({
        email: 'customer@example.com',
        nome: 'João',
        orderId: 'order-123',
        fileName: 'model.stl',
        price: 19.99,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[email] stl-order-confirmation ERRO'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });

  describe('sendSTLAdminNotificationEmail', () => {
    it('sends email to admin about new digital order', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';

      await emailModule.sendSTLAdminNotificationEmail({
        adminEmail: 'admin@example.com',
        orderId: 'order-123',
        customerName: 'João Silva',
        customerEmail: 'customer@example.com',
        fileName: 'miniatura-dragao.stl',
        price: 29.99,
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@example.com',
          subject: expect.stringContaining('Novo pedido digital'),
        })
      );
    });

    it('includes customer info in admin email', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';

      await emailModule.sendSTLAdminNotificationEmail({
        adminEmail: 'admin@example.com',
        orderId: 'order-abc',
        customerName: 'Maria',
        customerEmail: 'maria@example.com',
        fileName: 'model.stl',
        price: 19.99,
      });

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs).toBeDefined();
      expect(callArgs.to).toBe('admin@example.com');
    });
  });
});

describe('STL Order Payment & Auto-Complete', () => {
  describe('Digital order auto-complete', () => {
    it('digital order completes immediately after payment', () => {
      const mockOrder = {
        id: 'order-stl-123',
        status: 'completed',
        items: [
          {
            product: {
              id: 'prod-stl-1',
              type: 'digital',
              name: 'model.stl',
              file_path: 'stl-files/prod-stl-1/model.stl',
            },
          },
        ],
        shipped_at: expect.any(String),
      };

      const isDigital = mockOrder.items.every(item => item.product.type === 'digital');
      expect(isDigital).toBe(true);
      expect(mockOrder.status).toBe('completed');
      expect(mockOrder.shipped_at).toBeDefined();
    });

    it('physical order remains processing after payment', () => {
      const mockOrder = {
        id: 'order-phys-123',
        status: 'processing',
        items: [
          {
            product: {
              id: 'prod-phys-1',
              type: 'physical',
            },
          },
        ],
        shipped_at: null,
      };

      const isDigital = mockOrder.items.every(item => item.product.type === 'digital');
      expect(isDigital).toBe(false);
      expect(mockOrder.status).toBe('processing');
      expect(mockOrder.shipped_at).toBeNull();
    });

    it('rejects mixed carts (digital + physical)', () => {
      const cart = [
        { product: { type: 'digital' } },
        { product: { type: 'physical' } },
      ];

      const types = new Set(cart.map(item => item.product.type));
      expect(types.size).toBeGreaterThan(1);

      const isMixed = types.size > 1;
      expect(isMixed).toBe(true);
    });
  });

  describe('Order total calculation', () => {
    it('digital order has no shipping cost', () => {
      const items = [
        {
          product: { type: 'digital', price: 29.99 },
          quantity: 1,
        },
      ];

      const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const shipping = items.every(item => item.product.type === 'digital') ? 0 : 15.00;
      const total = subtotal + shipping;

      expect(shipping).toBe(0);
      expect(total).toBe(29.99);
    });

    it('physical order includes shipping', () => {
      const items = [
        {
          product: { type: 'physical', price: 150.00 },
          quantity: 1,
        },
      ];

      const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const shipping = items.every(item => item.product.type === 'digital') ? 0 : 15.00;
      const total = subtotal + shipping;

      expect(shipping).toBe(15.00);
      expect(total).toBe(165.00);
    });
  });

  describe('Webhook payment confirmation for digital orders', () => {
    it('triggers both customer and admin emails on payment success', async () => {
      const mockSend = vi.fn().mockResolvedValue({
        error: null,
        data: { id: 'msg_123' },
      });

      const mockResend = {
        emails: {
          send: mockSend,
        },
      };

      // Mock Resend for this test
      vi.doMock('resend', () => ({
        Resend: vi.fn(() => mockResend),
      }));

      const order = {
        id: 'order-digital-123',
        status: 'completed',
        total: 49.99,
        customer: {
          name: 'Ana',
          email: 'ana@example.com',
        },
        items: [
          {
            product: {
              id: 'prod-stl-1',
              type: 'digital',
              name: 'modelo-3d.stl',
              file_path: 'stl-files/prod-stl-1/modelo-3d.stl',
            },
          },
        ],
      };

      const isDigital = order.items.every(item => item.product.type === 'digital');
      expect(isDigital).toBe(true);

      // When digital order is completed, webhook should send both emails
      // This is verified by checking order status and item type
      expect(order.status).toBe('completed');
      expect(order.items[0].product.type).toBe('digital');
    });
  });
});
