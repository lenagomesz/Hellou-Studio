// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockFrom, mockGetSupabaseAdmin, usersBuilder } = vi.hoisted(() => {
  const chain = () => {
    const builder: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ['select', 'eq', 'insert', 'is', 'update']) {
      builder[method] = vi.fn().mockReturnValue(builder);
    }
    return builder;
  };

  const bannedBuilder = chain();
  bannedBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

  const usersBuilder = chain();
  usersBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  usersBuilder.single = vi.fn().mockResolvedValue({
    data: { id: 'user-123', email: 'cliente@example.com', name: 'Cliente', role: 'user' },
    error: null,
  });

  const preferencesBuilder = chain();
  preferencesBuilder.upsert = vi.fn().mockResolvedValue({ error: null });
  const manualOrdersBuilder = chain();

  const mockFrom = vi.fn((table: string) => ({
    banned_emails: bannedBuilder,
    users: usersBuilder,
    email_preferences: preferencesBuilder,
    manual_orders: manualOrdersBuilder,
  })[table]);
  const mockGetSupabaseAdmin = vi.fn(() => ({ from: mockFrom }));

  return { mockFrom, mockGetSupabaseAdmin, usersBuilder };
});

vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('hashed-password') } }));
vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: mockGetSupabaseAdmin }));
vi.mock('@/lib/email', () => ({
  sendAdminNewRegistrationEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from '@/app/api/auth/register/route';

function makeRequest(cpf?: unknown) {
  const body: Record<string, unknown> = {
    email: 'cliente@example.com',
    password: 'senha-segura',
    name: 'Cliente',
    phone: '11998765432',
  };
  if (cpf !== undefined) body.cpf = cpf;

  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register CPF', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([undefined, '', '111.111.111-11'])('rejects missing, empty, or invalid CPF before accessing the database: %s', async (cpf) => {
    const response = await POST(makeRequest(cpf));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('CPF válido é obrigatório');
    expect(mockGetSupabaseAdmin).not.toHaveBeenCalled();
  });

  it.each([52998224725, '529.982.247-251'])('rejects non-string and overlong CPF values without truncating them', async (cpf) => {
    const response = await POST(makeRequest(cpf));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('CPF válido é obrigatório');
    expect(mockGetSupabaseAdmin).not.toHaveBeenCalled();
  });

  it('accepts a valid CPF and persists its normalized digits', async () => {
    const response = await POST(makeRequest('529.982.247-25'));

    expect(response.status).toBe(201);
    expect(usersBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
      cpf: '52998224725',
      email: 'cliente@example.com',
    }));
    expect(mockFrom).toHaveBeenCalledWith('users');
  });
});
