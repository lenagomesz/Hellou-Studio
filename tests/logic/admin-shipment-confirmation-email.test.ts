// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@/lib/email-delivery', () => ({ sendTrackedEmail: send }));
vi.mock('@/lib/observability', () => ({ structuredLog: vi.fn() }));
vi.mock('resend', () => ({ Resend: class MockResend {} }));

import {
  sendAdminShipmentConfirmationEmail,
  shouldSendAdminShipmentConfirmation,
} from '@/lib/email';

describe('aviso administrativo de envio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_APP_URL = 'https://helloustudio.com.br';
    delete process.env.ADMIN_SHIPMENT_EMAIL;
    send.mockResolvedValue({ error: null, data: { id: 'email-test' } });
  });

  afterEach(() => {
    delete process.env.ADMIN_SHIPMENT_EMAIL;
  });

  it('envia para o destinatário seguro padrão com conteúdo e links escapados', async () => {
    await sendAdminShipmentConfirmationEmail({
      orderId: 'pedido/123?x=<script>',
      customerName: 'Ana <img src=x>',
      customerEmail: 'ana+teste@example.com',
      trackingCode: 'BR&<123>',
    });

    const [_, payload, context] = send.mock.calls[0] as [unknown, { to: string; subject: string; html: string }, { emailType: string; orderId: string }];
    expect(payload.to).toBe('studiohellou@gmail.com');
    expect(payload.html).toContain('Ana &lt;img src=x&gt;');
    expect(payload.html).toContain('BR&amp;&lt;123&gt;');
    expect(payload.html).not.toContain('<img src=x>');
    expect(payload.html).toContain('https://melhorrastreio.com.br/BR%26%3C123%3E');
    expect(payload.html).toContain('/dashboard/orders/pedido%2F123%3Fx%3D%3Cscript%3E');
    expect(context).toMatchObject({ emailType: 'admin_shipment_confirmation', orderId: 'pedido/123?x=<script>' });
  });

  it('respeita ADMIN_SHIPMENT_EMAIL quando configurado', async () => {
    process.env.ADMIN_SHIPMENT_EMAIL = 'operacao@example.com';

    await sendAdminShipmentConfirmationEmail({
      orderId: 'pedido-123', customerName: null, customerEmail: null, trackingCode: 'AB123',
    });

    expect(send.mock.calls[0][1]).toMatchObject({ to: 'operacao@example.com' });
  });

  it('só avisa numa transição real para enviado com rastreio', () => {
    expect(shouldSendAdminShipmentConfirmation({ previousStatus: 'processing', newStatus: 'shipped', trackingCode: 'AB123' })).toBe(true);
    expect(shouldSendAdminShipmentConfirmation({ previousStatus: 'shipped', newStatus: 'shipped', trackingCode: 'AB123' })).toBe(false);
    expect(shouldSendAdminShipmentConfirmation({ previousStatus: 'processing', newStatus: 'shipped', trackingCode: '   ' })).toBe(false);
    expect(shouldSendAdminShipmentConfirmation({ previousStatus: 'processing', newStatus: 'processing', trackingCode: 'AB123' })).toBe(false);
  });
});
