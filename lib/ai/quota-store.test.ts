import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ read: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }) }), rpc: mocks.rpc }),
}));
import { GeminiQuotaError } from './quota-error';
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-08-28T12:00:00Z')); });
afterEach(() => vi.useRealTimers());
describe('shared quota persistence', () => {
  it('reads a pause from another server instance and expires it', async () => {
    mocks.read.mockResolvedValue({ data: { kind: 'rate', retry_at: '2026-08-28T12:01:00Z' } });
    const store = await import('./quota-store');
    expect((await store.getGeminiQuotaPause('test'))?.kind).toBe('rate');
    vi.setSystemTime(new Date('2026-08-28T12:02:00Z'));
    expect(await store.getGeminiQuotaPause('test')).toBeNull();
  });
  it('persists the pause and never shortens an already observed daily pause', async () => {
    mocks.rpc.mockResolvedValue({});
    const store = await import('./quota-store');
    const daily = new GeminiQuotaError('daily', '2026-08-29T07:01:00Z');
    await store.rememberGeminiQuotaPause(daily, 'test');
    await store.rememberGeminiQuotaPause(new GeminiQuotaError('rate', '2026-08-28T12:01:00Z'), 'test');
    expect(await store.getGeminiQuotaPause('test')).toBe(daily);
    expect(mocks.rpc).toHaveBeenLastCalledWith('pause_gemini_quota', { p_model: 'test', p_kind: 'daily', p_retry_at: daily.retryAt });
  });
  it('falls back to local pauses if the migration is absent', async () => {
    mocks.read.mockResolvedValue({ error: { message: 'missing table' } });
    mocks.rpc.mockResolvedValue({ error: { message: 'missing function' } });
    const store = await import('./quota-store');
    expect(await store.getGeminiQuotaPause('test')).toBeNull();
    const pause = new GeminiQuotaError('rate', '2026-08-28T12:01:00Z');
    await store.rememberGeminiQuotaPause(pause, 'test');
    expect(await store.getGeminiQuotaPause('test')).toBe(pause);
  });
});
