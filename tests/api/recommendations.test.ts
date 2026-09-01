import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/recommendations/route';
import { getKitCatalog } from '@/lib/kit-catalog';
import { kitProduct } from '@/tests/fixtures/kit-products';

vi.mock('@/lib/kit-catalog', () => ({ getKitCatalog: vi.fn() }));

beforeEach(() => vi.clearAllMocks());
describe('sugestões do carrinho', () => {
  it('exclui todos os IDs informados e retorna só informações públicas da sugestão', async () => {
    vi.mocked(getKitCatalog).mockResolvedValue([
      kitProduct('boca', 6.9), kitProduct('lip', 20.9, { cost_price: 1 }), kitProduct('vaso', 89.9), kitProduct('digital', 10, { type: 'digital' }),
    ]);
    const response = await GET(new NextRequest('http://localhost/api/recommendations?exclude=vaso,boca&remaining=9.10'));
    expect(await response.json()).toEqual({ products: [{ id: 'lip', name: 'lip', image_url: null, starting_price: 20.9 }] });
  });
  it('retorna uma lista vazia se o catálogo não estiver disponível', async () => {
    vi.mocked(getKitCatalog).mockResolvedValue([]);
    const response = await GET(new NextRequest('http://localhost/api/recommendations?remaining=NaN'));
    expect(await response.json()).toEqual({ products: [] });
  });
});
