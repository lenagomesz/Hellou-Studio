import { describe, expect, it } from 'vitest';
import { findBestSellerProductIds } from '@/lib/best-sellers';

describe('findBestSellerProductIds', () => {
  const products = [
    { id: 'a', category: 'chaveiros' },
    { id: 'b', category: 'chaveiros' },
    { id: 'c', category: 'decoracao' },
  ];

  it('seleciona somente o produto com mais unidades vendidas em cada categoria', () => {
    const result = findBestSellerProductIds(products, [
      { product_id: 'a', quantity: 2 },
      { product_id: 'b', quantity: 3 },
      { product_id: 'b', quantity: 4 },
      { product_id: 'c', quantity: 1 },
    ]);

    expect(result).toEqual(['b', 'c']);
  });

  it('não cria vencedor para uma categoria sem vendas', () => {
    expect(findBestSellerProductIds(products, [])).toEqual([]);
  });

  it('mantém um único vencedor em caso de empate', () => {
    const result = findBestSellerProductIds(products, [
      { product_id: 'b', quantity: 2 },
      { product_id: 'a', quantity: 2 },
    ]);

    expect(result).toEqual(['a']);
  });
});
