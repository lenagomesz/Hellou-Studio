import { afterEach, describe, expect, it, vi } from 'vitest';
import { productImageStoragePath } from './product-generator';
vi.mock('./gemini-client', () => ({ geminiClient: {} }));
vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: vi.fn() }));
afterEach(() => vi.unstubAllEnvs());
describe('safe image storage paths', () => {
  it('accepts only local product images and the configured storage origin', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://store.supabase.co');
    expect(productImageStoragePath('/api/product-images/product-images/a/file.png')).toBe('product-images/a/file.png');
    expect(productImageStoragePath('https://store.supabase.co/storage/v1/object/public/products/a/file.png')).toBe('a/file.png');
  });
  it.each(['https://localhost/a', 'http://169.254.169.254/latest/meta-data', '//evil.test/file', '/api/product-images/private/a', '/api/product-images/product-images/../private', '/api/product-images/product-images/%2e%2e/private', '/api/product-images/product-images/a?url=http://localhost', 'https://evil.test/storage/v1/object/public/products/a.png'])('rejects arbitrary fetch targets: %s', value => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://store.supabase.co');
    expect(productImageStoragePath(value)).toBeNull();
  });
});
