import { vi } from 'vitest';

export function createMockQueryBuilder(data: unknown[] | null = [], error: unknown = null) {
  const builder: Record<string, unknown> = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'lt', 'gte', 'lte',
    'in', 'not', 'ilike', 'like', 'is',
    'order', 'limit', 'range', 'single', 'maybeSingle',
  ];

  for (const method of methods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  builder['single'] = vi.fn().mockResolvedValue({ data: data?.[0] ?? null, error });
  builder['maybeSingle'] = vi.fn().mockResolvedValue({ data: data?.[0] ?? null, error });
  builder['then'] = (resolve: (v: unknown) => void) => resolve({ data, error });

  Object.defineProperty(builder, 'data', { get: () => data });
  Object.defineProperty(builder, 'error', { get: () => error });

  return builder;
}

export function createMockSupabaseAdmin(overrides: Record<string, unknown> = {}) {
  const mockFrom = vi.fn().mockReturnValue(createMockQueryBuilder());

  return {
    from: mockFrom,
    ...overrides,
  };
}

export function mockGetSupabaseAdmin(data: unknown[] | null = [], error: unknown = null) {
  const queryBuilder = createMockQueryBuilder(data, error);
  const mockFrom = vi.fn().mockReturnValue(queryBuilder);
  const admin = { from: mockFrom };

  vi.doMock('@/lib/supabase', () => ({
    getSupabaseAdmin: () => admin,
    supabase: admin,
    withTimeout: <T>(p: Promise<T>) => p,
  }));

  return { admin, mockFrom, queryBuilder };
}
