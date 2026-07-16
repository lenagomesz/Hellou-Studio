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

import { sendPartnerWelcomeEmail } from '@/lib/email';

describe('e-mail de boas-vindas da sócia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_APP_URL = 'https://helloustudio.com.br';
    mockSendTrackedEmail.mockResolvedValue({ error: null, data: { id: 'email-1' } });
  });

  it('envia o link do painel e não inclui a senha temporária', async () => {
    const sent = await sendPartnerWelcomeEmail('socia@example.com', 'Ana <script>');

    expect(sent).toBe(true);
    expect(mockSendTrackedEmail).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        to: 'socia@example.com',
        subject: expect.stringContaining('Bem-vinda'),
        html: expect.stringContaining('https://helloustudio.com.br/login?callbackUrl=%2Fdashboard'),
      }),
      expect.objectContaining({ emailType: 'partner_welcome' }),
    );
    const payload = mockSendTrackedEmail.mock.calls[0][1] as { html: string };
    expect(payload.html).toContain('Ana &lt;script&gt;');
    expect(payload.html).toContain('A senha não é enviada neste e-mail');
  });
});
