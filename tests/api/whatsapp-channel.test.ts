import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const requirePermission = vi.fn();
vi.mock('@/lib/api', () => ({ requirePermission }));
vi.mock('@/lib/whatsapp-channel', () => ({
  CHANNEL_URL: 'https://whatsapp.com/channel/test',
  THEMES: ['product'],
  generateChannelCaption: vi.fn(),
  generateScheduledChannelPosts: vi.fn(),
  productLink: vi.fn(),
  productPrice: vi.fn(),
}));

describe('Central de WhatsApp: permissões', () => {
  beforeEach(() => requirePermission.mockReset());

  it('recusa leitura sem permissão de marketing antes de acessar dados', async () => {
    requirePermission.mockResolvedValue({ response: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) });
    const { GET } = await import('@/app/api/admin/whatsapp-channel/route');
    const response = await GET();
    expect(response.status).toBe(403);
    expect(requirePermission).toHaveBeenCalledWith('marketing.manage');
  });

  it('recusa edição sem permissão de marketing', async () => {
    requirePermission.mockResolvedValue({ response: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) });
    const { PATCH } = await import('@/app/api/admin/whatsapp-channel/route');
    const response = await PATCH(new Request('http://localhost/api/admin/whatsapp-channel', { method: 'PATCH', body: '{}' }));
    expect(response.status).toBe(403);
  });
});
