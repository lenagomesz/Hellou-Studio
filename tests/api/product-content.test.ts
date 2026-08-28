import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), limit: vi.fn(), generate: vi.fn(), images: vi.fn() }));
vi.mock('@/lib/api', () => ({ requirePermission: mocks.auth }));
vi.mock('@/lib/durable-rate-limit', () => ({ durableRateLimit: mocks.limit }));
vi.mock('@/lib/ai/product-generator', () => ({ generateProductContent: mocks.generate, loadProductImages: mocks.images }));
import { POST } from '@/app/api/admin/ai/product-content/route';
import { GeminiQuotaError } from '@/lib/ai/quota-error';
const request = (body: unknown) => new Request('http://localhost/api/admin/ai/product-content', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('GOOGLE_GENAI_API_KEY', 'test');
  mocks.auth.mockResolvedValue({ user: { id: 'admin' } }); mocks.limit.mockResolvedValue({ success: true });
  mocks.images.mockResolvedValue({ images: [], loadedUrls: [] });
  mocks.generate.mockResolvedValue({ title: 'Lula', keywords: ['lula'] });
});
afterEach(() => vi.unstubAllEnvs());
describe('product content API', () => {
  it('returns a friendly quota response and Retry-After without provider details', async () => {
    mocks.generate.mockRejectedValue(new GeminiQuotaError('daily', '2099-01-01T08:01:00.000Z'));
    const response = await POST(request({ keywords: 'lula' }));
    expect(response.status).toBe(429);
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(60);
    const data = await response.json();
    expect(data).toMatchObject({ code: 'GEMINI_QUOTA_EXCEEDED', quotaKind: 'daily' });
    expect(data.error).toContain('cadastro manual continua disponível');
    expect(data.error).not.toContain('generativelanguage.googleapis');
  });
  it('requires catalog permissions before calling AI', async () => {
    mocks.auth.mockResolvedValue({ response: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) });
    expect((await POST(request({ keywords: 'lula' }))).status).toBe(403);
    expect(mocks.auth).toHaveBeenCalledWith('products.manage'); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('supports keywords only and never invents a price', async () => {
    const response = await POST(request({ keywords: 'lula, roxo' }));
    expect(response.status).toBe(200); expect((await response.json()).calculation).toBeNull();
  });
  it('calculates price only from validated weight and print time', async () => {
    const response = await POST(request({ keywords: 'lula', pricing: { weightGrams: 100, hours: 2, minutes: 30, filamentPricePerKg: 100 } }));
    const result = await response.json(); expect(response.status).toBe(200); expect(result.calculation.custo_total).toBe(14);
  });
  it.each([{ keywords: '' }, { keywords: 'x'.repeat(1001) }, { keywords: 'lula', pricing: { weightGrams: -1 } }, { keywords: 25 }, null])('rejects malformed input', async body => {
    expect((await POST(request(body))).status).toBe(400); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('returns a clear error for unreadable images without generating fake alt text', async () => {
    expect((await POST(request({ keywords: 'lula', imageUrl: 'https://evil.test/image.png' }))).status).toBe(400);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('enforces rate limits and configuration', async () => {
    mocks.limit.mockResolvedValue({ success: false });
    expect((await POST(request({ keywords: 'lula' }))).status).toBe(429);
    vi.stubEnv('GOOGLE_GENAI_API_KEY', '');
    expect((await POST(request({ keywords: 'lula' }))).status).toBe(503); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('does not expose provider errors', async () => {
    mocks.generate.mockRejectedValue(new Error('secret token detail'));
    const response = await POST(request({ keywords: 'lula' }));
    expect(response.status).toBe(502); expect(await response.text()).not.toContain('secret');
  });
});
