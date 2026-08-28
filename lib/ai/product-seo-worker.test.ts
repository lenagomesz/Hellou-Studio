import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), generate: vi.fn(), images: vi.fn(), revalidate: vi.fn(), pause: vi.fn() }));
vi.mock('./quota-store', () => ({ getGeminiQuotaPause: mocks.pause }));
vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: () => ({ rpc: mocks.rpc, from: mocks.from }) }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('./product-generator', () => ({ generateProductContent: mocks.generate, loadProductImages: mocks.images }));
import { processProductSEO, processProductSEOSafely } from './product-seo-worker';
import { GeminiQuotaError } from './quota-error';
const job = { product_id: 'product', revision: 'version1' };
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('GOOGLE_GENAI_API_KEY', 'test');
  mocks.pause.mockResolvedValue(null);
  mocks.rpc.mockImplementation(async (name: string) => name === 'claim_product_seo' ? { data: [job] } : { data: true });
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'product', name: 'Lula', seo_title: 'Manual', seo_description: null } }), update: vi.fn().mockReturnThis() };
  mocks.from.mockReturnValue(query);
  mocks.images.mockResolvedValue({ images: [], loadedUrls: [] });
  mocks.generate.mockResolvedValue({ title: 'Lula', description: 'Texto', seo_title: 'IA', seo_description: 'Descrição nova', keywords: ['lula'], image_alts: [] });
});
afterEach(() => vi.unstubAllEnvs());
describe('durable product SEO worker', () => {
  it('does not claim or consume attempts during a shared quota pause', async () => {
    const pause = new GeminiQuotaError('daily', '2099-01-01T08:01:00.000Z');
    mocks.pause.mockResolvedValue(pause);
    expect(await processProductSEO()).toMatchObject({ processed: 0, pausedUntil: pause.retryAt });
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('refunds only the quota attempt and defers through revision-checked RPC', async () => {
    const pause = new GeminiQuotaError('daily', '2099-01-01T08:01:00.000Z');
    mocks.generate.mockRejectedValue(pause);
    expect(await processProductSEO()).toMatchObject({ pausedUntil: pause.retryAt, results: [{ status: 'deferred' }] });
    expect(mocks.rpc.mock.calls.map(c => c[0])).toEqual(['claim_product_seo', 'defer_product_seo_quota']);
    expect(mocks.rpc).toHaveBeenCalledWith('defer_product_seo_quota', {
      p_product_id: job.product_id, p_revision: job.revision, p_retry_at: pause.retryAt, p_message: pause.message,
    });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it('does not claim a stale job was deferred after a concurrent edit', async () => {
    mocks.generate.mockRejectedValue(new GeminiQuotaError('rate', '2099-01-01T08:01:00.000Z'));
    mocks.rpc.mockImplementation(async (name: string) => name === 'claim_product_seo' ? { data: [job] } : { data: false });
    expect((await processProductSEO()).results[0].status).toBe('changed');
  });
  it('reports a missing quota migration rather than claiming a refund', async () => {
    mocks.generate.mockRejectedValue(new GeminiQuotaError('daily', '2099-01-01T08:01:00.000Z'));
    mocks.rpc.mockImplementation(async (name: string) => name === 'claim_product_seo' ? { data: [job] } : { error: { message: 'missing RPC' } });
    expect((await processProductSEO()).results[0]).toMatchObject({ status: 'failed', message: expect.stringContaining('migração') });
  });
  it('claims jobs and writes through revision-checked RPC without replacing manual SEO', async () => {
    const result = await processProductSEO('product');
    expect(result.results[0].status).toBe('updated');
    expect(mocks.rpc).toHaveBeenCalledWith('claim_product_seo', { p_product_id: 'product', p_limit: 1 });
    const patch = mocks.rpc.mock.calls.find(c => c[0] === 'finish_product_seo')![1];
    expect(patch.p_revision).toBe('version1'); expect(patch.p_patch.seo_title).toBeUndefined();
    expect(patch.p_patch.seo_description).toBe('Descrição nova'); expect(mocks.revalidate).toHaveBeenCalled();
  });
  it('discards stale output after concurrent edits', async () => {
    mocks.rpc.mockImplementation(async (name: string) => name === 'claim_product_seo' ? { data: [job] } : { data: false });
    const result = await processProductSEO(); expect(result.results[0].status).toBe('changed'); expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it('retains failed jobs without changing products', async () => {
    mocks.generate.mockRejectedValue(new Error('Provider failure'));
    const result = await processProductSEO(); expect(result.results[0].status).toBe('failed');
    expect(mocks.rpc.mock.calls.map(c => c[0])).toEqual(['claim_product_seo']);
    expect(mocks.from).toHaveBeenCalledWith('product_seo_jobs');
  });
  it('does not consume retries when the API key is missing', async () => {
    vi.stubEnv('GOOGLE_GENAI_API_KEY', '');
    await expect(processProductSEO()).rejects.toThrow('GOOGLE_GENAI_API_KEY'); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('does not fail manual product saves if the migration or provider is unavailable', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'missing function' } });
    await expect(processProductSEOSafely()).resolves.toBeUndefined();
  });
});
