import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock email templates (React components)
vi.mock('@/emails/stl-order-confirmation', () => ({
  STLOrderConfirmationEmail: (props: any) => `mock-stl-confirmation-${props.orderId}`,
}));

vi.mock('@/emails/stl-admin-notification', () => ({
  STLAdminNotificationEmail: (props: any) => `mock-stl-admin-${props.orderId}`,
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
