import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: { user: { id: 'user-1' } } as { user: { id: string } } | null,
  order: null as unknown,
  createSignedUrl: vi.fn(),
}));

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn(async () => mocks.session) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/observability', () => ({ structuredLog: vi.fn() }));
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: mocks.order, error: mocks.order ? null : new Error('x') }) }),
      }),
    }),
    storage: { from: (bucket: string) => ({ createSignedUrl: (path: string, ttl: number, opts: unknown) => mocks.createSignedUrl(bucket, path, ttl, opts) }) },
  }),
}));

import { GET } from '@/app/api/orders/[id]/download/[fileId]/route';

function makeOrder(status: string, userId = 'user-1') {
  return {
    id: 'order-1',
    user_id: userId,
    status,
    order_items: [{ product_id: 'p1', product: { id: 'p1', name: 'Dragao', file_path: 'dragao.stl', type: 'digital' } }],
  };
}

const call = () =>
  GET(new Request('http://localhost/api/orders/order-1/download/p1') as never, {
    params: Promise.resolve({ id: 'order-1', fileId: 'p1' }),
  });

describe('GET /api/orders/[id]/download/[fileId]', () => {
  beforeEach(() => {
    mocks.session = { user: { id: 'user-1' } };
    mocks.order = makeOrder('delivered');
    mocks.createSignedUrl.mockReset();
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.example/signed?token=abc' }, error: null });
  });

  it('exige login', async () => {
    mocks.session = null;
    expect((await call()).status).toBe(401);
  });

  it('bloqueia pedido de outro cliente', async () => {
    mocks.order = makeOrder('delivered', 'user-2');
    expect((await call()).status).toBe(403);
  });

  it.each(['awaiting_payment', 'pending', 'canceled', 'rejected', 'refunded'])('bloqueia pedido %s', async (status) => {
    mocks.order = makeOrder(status);
    expect((await call()).status).toBe(403);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it.each(['approved', 'processing', 'delivered', 'shipped', 'completed', 'paid'])('libera pedido %s com URL assinada curta', async (status) => {
    mocks.order = makeOrder(status);
    const res = await call();
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://storage.example/signed?token=abc');
    expect(res.headers.get('cache-control')).toContain('no-store');
    const [, , ttl, opts] = mocks.createSignedUrl.mock.calls[0];
    expect(ttl).toBeLessThanOrEqual(120);
    expect(opts).toEqual({ download: 'Dragao.stl' });
  });

  it('tenta os buckets seguintes e devolve 404 se o arquivo não existe', async () => {
    mocks.createSignedUrl.mockResolvedValue({ data: null, error: { message: 'Object not found' } });
    expect((await call()).status).toBe(404);
    expect(mocks.createSignedUrl.mock.calls.length).toBeGreaterThan(1);
  });
});
