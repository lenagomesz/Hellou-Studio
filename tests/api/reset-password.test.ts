// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockRpc, tokenBuilder, userBuilder } = vi.hoisted(() => {
  const makeBuilder = (result: unknown) => {
    const builder: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ['select', 'eq', 'gt', 'update', 'delete']) {
      builder[method] = vi.fn().mockReturnValue(builder);
    }
    builder.maybeSingle = vi.fn().mockResolvedValue({ data: result, error: null });
    return builder;
  };

  return {
    mockRpc: vi.fn(),
    tokenBuilder: makeBuilder({ user_id: 'user-123' }),
    userBuilder: makeBuilder({ id: 'user-123' }),
  };
});

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('new-password-hash'),
  },
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => table === 'users' ? userBuilder : tokenBuilder,
    rpc: mockRpc,
  }),
}));

import { POST } from '@/app/api/auth/reset-password/route';

function makeRequest(password = 'nova-senha-segura') {
  return new NextRequest('http://localhost/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'valid-token', password }),
  });
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenBuilder.maybeSingle.mockResolvedValue({ data: { user_id: 'user-123' }, error: null });
    userBuilder.maybeSingle.mockResolvedValue({ data: { id: 'user-123' }, error: null });
  });

  it('mantém o token até a senha ser atualizada e o consome depois', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith('change_password_after_reset', {
      p_user_id: 'user-123',
      p_password_hash: 'new-password-hash',
    });
    expect(tokenBuilder.delete).toHaveBeenCalledOnce();
  });

  it('atualiza diretamente quando a função RPC ainda não existe', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } })
      .mockResolvedValueOnce({ data: null, error: null });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(userBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
      password_hash: 'new-password-hash',
    }));
    expect(mockRpc).toHaveBeenLastCalledWith('revoke_user_sessions', {
      p_user_id: 'user-123',
    });
    expect(tokenBuilder.delete).toHaveBeenCalledOnce();
  });

  it('usa a mesma regra de oito caracteres da tela', async () => {
    const response = await POST(makeRequest('curta'));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('8 e 128');
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
