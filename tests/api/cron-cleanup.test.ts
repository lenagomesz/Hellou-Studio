import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

const mockSelect = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockLt = vi.fn();
const mockNot = vi.fn();
const mockIn = vi.fn();
const mockRequireAdmin = vi.fn();
let POST: typeof import('@/app/api/cron/cleanup-encomendas/route').POST;

vi.mock('@/lib/api', () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'print_requests') {
        return {
          select: mockSelect.mockReturnValue({
            eq: mockEq.mockReturnValue({
              lt: mockLt.mockReturnValue({
                not: mockNot,
              }),
            }),
          }),
        };
      }
      if (table === 'products') {
        return {
          delete: mockDelete.mockReturnValue({
            in: mockIn.mockReturnValue({
              eq: mockEq,
            }),
          }),
        };
      }
      return {};
    },
  }),
}));

describe('Cron Cleanup Encomendas', () => {
  beforeAll(async () => {
    ({ POST } = await import('@/app/api/cron/cleanup-encomendas/route'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    });
  });

  it('should reject requests without valid CRON_SECRET', async () => {
    const request = new Request('http://localhost/api/cron/cleanup-encomendas', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret' },
    });

    process.env.CRON_SECRET = 'test-secret';
    const response = await POST(request);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return deleted: 0 when no requests found', async () => {
    mockNot.mockResolvedValue({ data: [] });
    process.env.CRON_SECRET = 'test-secret';

    const request = new Request('http://localhost/api/cron/cleanup-encomendas', {
      method: 'POST',
      headers: { authorization: 'Bearer test-secret' },
    });

    const response = await POST(request);
    const body = await response.json();
    expect(body.deleted).toBe(0);
  });

  it('allows an authenticated administrator to run it manually', async () => {
    mockRequireAdmin.mockResolvedValue({ response: null });
    mockNot.mockResolvedValue({ data: [] });
    process.env.CRON_SECRET = 'test-secret';

    const request = new Request('http://localhost/api/cron/cleanup-encomendas', {
      method: 'POST',
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockRequireAdmin).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ deleted: 0 });
  });
});
