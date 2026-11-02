import { describe, expect, it } from 'vitest';
import { findBestSellerProductIds, summarizeProductSales } from '@/lib/best-sellers';
import { selectCollectionBestSellers } from '@/lib/collection-best-sellers';

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

  it('conta um pedido uma única vez mesmo com variações e várias unidades', () => {
    expect(summarizeProductSales([
      { product_id: 'a', order_id: 'order-1', quantity: 3 },
      { product_id: 'a', order_id: 'order-1', quantity: 2 },
      { product_id: 'a', order_id: 'order-2', quantity: 1 },
      { product_id: 'b', order_id: 'order-2', quantity: 0 },
    ])).toEqual({ a: { orderCount: 2, unitsSold: 6 } });
  });

  it('destaca apenas peças vendidas da coleção e ordena por unidades confirmadas', () => {
    const result = selectCollectionBestSellers([
      { id: 'natal-1', sold_quantity: 2 },
      { id: 'natal-2', sold_quantity: 4 },
      { id: 'sem-vendas', sold_quantity: 0 },
      { id: 'sem-dados' },
    ]);
    expect(result.map(product => product.id)).toEqual(['natal-2', 'natal-1']);
    expect(selectCollectionBestSellers([{ id: 'novo' }])).toEqual([]);
  });
});
