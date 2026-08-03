// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MANUAL_ORDER_EMAIL_RE,
  MANUAL_ORDER_PAYMENT_STATUSES,
  MANUAL_ORDER_STATUSES,
  normalizeManualOrderEmail,
} from '@/lib/manual-orders';

const { mockSendTrackedEmail } = vi.hoisted(() => ({ mockSendTrackedEmail: vi.fn() }));

vi.mock('@/lib/email-delivery', () => ({ sendTrackedEmail: mockSendTrackedEmail }));
vi.mock('@/lib/observability', () => ({ structuredLog: vi.fn() }));
vi.mock('resend', () => ({ Resend: class MockResend {} }));

import { sendManualOrderInviteEmail } from '@/lib/email';

describe('encomendas externas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_APP_URL = 'https://helloustudio.com.br';
    mockSendTrackedEmail.mockResolvedValue({ error: null, data: { id: 'email-1' } });
  });

  it('mantém pagamento manual separado do andamento da encomenda', () => {
    expect(MANUAL_ORDER_PAYMENT_STATUSES).toEqual(['pending', 'paid']);
    expect(MANUAL_ORDER_STATUSES).toContain('in_production');
    expect(MANUAL_ORDER_STATUSES).toContain('delivered');
  });

  it('normaliza e valida o e-mail usado no vínculo automático', () => {
    expect(normalizeManualOrderEmail('  Cliente@Example.COM ')).toBe('cliente@example.com');
    expect(MANUAL_ORDER_EMAIL_RE.test('cliente@example.com')).toBe(true);
    expect(MANUAL_ORDER_EMAIL_RE.test('email-invalido')).toBe(false);
  });

  it('envia convite informando que a encomenda existe mesmo sem criar conta', async () => {
    const sent = await sendManualOrderInviteEmail({
      email: 'cliente@example.com',
      customerName: 'Ana <script>',
      orderTitle: 'Gatinho personalizado',
      manualOrderId: 'manual-123',
    });

    expect(sent).toBe(true);
    expect(mockSendTrackedEmail).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        to: 'cliente@example.com',
        html: expect.stringContaining('continuará registrada mesmo que você não crie a conta'),
      }),
      expect.objectContaining({
        emailType: 'manual_order_invite',
        metadata: { manualOrderId: 'manual-123' },
      }),
    );
    const payload = mockSendTrackedEmail.mock.calls[0][1] as { html: string };
    expect(payload.html).toContain('Ana &lt;script&gt;');
  });
});
