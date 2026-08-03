// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSendTrackedEmail } = vi.hoisted(() => ({
  mockSendTrackedEmail: vi.fn(),
}));

vi.mock('@/lib/email-delivery', () => ({
  sendTrackedEmail: mockSendTrackedEmail,
}));

vi.mock('@/lib/observability', () => ({
  structuredLog: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class MockResend {},
}));

import { sendAdminNewRegistrationEmail } from '@/lib/email';

describe('notificação administrativa de novo cadastro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_APP_URL = 'https://helloustudio.com.br';
    mockSendTrackedEmail.mockResolvedValue({ error: null, data: { id: 'email-1' } });
  });

  it('envia os dados do cliente e o link direto para o painel', async () => {
    const sent = await sendAdminNewRegistrationEmail({
      adminEmail: 'studiohellou@gmail.com',
      userId: 'user-123',
      customerName: 'Ana <script>',
      customerEmail: 'ana@example.com',
      customerPhone: '47999999999',
      marketingConsent: false,
    });

    expect(sent).toBe(true);
    expect(mockSendTrackedEmail).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        to: 'studiohellou@gmail.com',
        subject: expect.stringContaining('Novo cadastro'),
        html: expect.stringContaining('https://helloustudio.com.br/dashboard/users/user-123'),
      }),
      expect.objectContaining({
        emailType: 'admin_new_registration',
        metadata: { userId: 'user-123', marketingConsent: false },
      }),
    );
    const payload = mockSendTrackedEmail.mock.calls[0][1] as { html: string };
    expect(payload.html).toContain('Ana &lt;script&gt;');
    expect(payload.html).toContain('Não autorizado');
  });
});
