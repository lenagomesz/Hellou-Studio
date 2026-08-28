import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), generate: vi.fn(), images: vi.fn(), revalidate: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: () => ({ rpc: mocks.rpc, from: mocks.from }) }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('./product-generator', () => ({ generateProductContent: mocks.generate, loadProductImages: mocks.images }));
import { processProductSEO, processProductSEOSafely } from './product-seo-worker';
const job = { product_id: 'product', revision: 'version1' };
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('GOOGLE_GENAI_API_KEY', 'test');
  mocks.rpc.mockImplementation(async (name: string) => name === 'claim_product_seo' ? { data: [job] } : { data: true });
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'product', name: 'Lula', seo_title: 'Manual', seo_description: null } }), update: vi.fn().mockReturnThis() };
  mocks.from.mockReturnValue(query);
  mocks.images.mockResolvedValue({ images: [], loadedUrls: [] });
  mocks.generate.mockResolvedValue({ title: 'Lula', description: 'Texto', seo_title: 'IA', seo_description: 'Descrição nova', keywords: ['lula'], image_alts: [] });
});
afterEach(() => vi.unstubAllEnvs());
describe('durable product SEO worker', () => {
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
