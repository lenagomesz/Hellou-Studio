import { describe, expect, it, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { attachProductTags } from '@/lib/product-tags';

describe('tags dos produtos', () => {
  it('vincula as tags corretas a cada produto', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'product_tag_assignments') {
        return { select: () => ({ in: vi.fn().mockResolvedValue({ data: [
          { product_id: 'p1', tag_id: 't1' },
          { product_id: 'p1', tag_id: 't2' },
          { product_id: 'p2', tag_id: 't2' },
        ], error: null }) }) };
      }
      return { select: () => ({
        in: () => ({ order: vi.fn().mockResolvedValue({ data: [
          { id: 't1', name: 'Novo', color: '#22C55E', created_at: '' },
          { id: 't2', name: 'Destaque', color: '#8B5CF6', created_at: '' },
        ], error: null }) }),
      }) };
    });

    const products = await attachProductTags([{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }]);

    expect(products[0].tags.map((tag) => tag.name)).toEqual(['Novo', 'Destaque']);
    expect(products[1].tags.map((tag) => tag.name)).toEqual(['Destaque']);
  });

  it('mantém produtos sem tags quando não existem vínculos', async () => {
    mockFrom.mockReturnValue({ select: () => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }) });

    await expect(attachProductTags([{ id: 'p1' }])).resolves.toEqual([{ id: 'p1', tags: [] }]);
  });
});
