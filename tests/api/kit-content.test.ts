import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), limit: vi.fn(), generate: vi.fn() }));
vi.mock('@/lib/api', () => ({ requirePermission: mocks.auth }));
vi.mock('@/lib/durable-rate-limit', () => ({ durableRateLimit: mocks.limit }));
vi.mock('@/lib/ai/kit-content', () => ({ generateKitContent: mocks.generate }));

import { POST } from '@/app/api/admin/ai/kit-content/route';

const validBody = {
  current: { title: 'Kit atual', eyebrow: 'Para combinar', description: 'Descrição atual' },
  productNames: ['Vaso', 'Chaveiro'],
};
const request = (body: unknown) => new Request('http://localhost/api/admin/ai/kit-content', {
  method: 'POST',
  body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('GOOGLE_GENAI_API_KEY', 'test');
  mocks.auth.mockResolvedValue({ user: { id: 'admin' } });
  mocks.limit.mockResolvedValue({ success: true });
  mocks.generate.mockResolvedValue({ title: 'Kit presente', eyebrow: 'Feitos para encantar', description: 'Dois produtos que combinam.' });
});

afterEach(() => vi.unstubAllEnvs());

describe('kit content API', () => {
  it('exige permissão das configurações da loja', async () => {
    mocks.auth.mockResolvedValue({ response: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) });
    expect((await POST(request(validBody))).status).toBe(403);
    expect(mocks.auth).toHaveBeenCalledWith('settings.manage');
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('gera uma sugestão sem salvar automaticamente', async () => {
    const response = await POST(request({ ...validBody, instruction: 'Tom de presente' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ content: { title: 'Kit presente' } });
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ productNames: ['Vaso', 'Chaveiro'] }));
  });

  it.each([
    { ...validBody, productNames: ['Vaso'] },
    { ...validBody, productNames: ['Vaso', ''] },
    { ...validBody, instruction: 'x'.repeat(501) },
    { current: null, productNames: ['Vaso', 'Chaveiro'] },
  ])('recusa dados inválidos', async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('mantém os textos atuais quando o provedor falha', async () => {
    mocks.generate.mockRejectedValue(new Error('detalhe secreto'));
    const response = await POST(request(validBody));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('secreto');
  });
});
