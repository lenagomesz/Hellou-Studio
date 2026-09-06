import { describe, expect, it } from 'vitest';
import { buildProductKits, getShippingProgress, getStartingPrice, selectComplementaryProducts } from '@/lib/product-kits';
import { kitOption, kitProduct, setupProducts } from '@/tests/fixtures/kit-products';

describe('kits e complementos do catálogo', () => {
  it('soma preços reais em centavos e não promete frete grátis para R$ 96,70', () => {
    const [kit] = buildProductKits(setupProducts());
    expect(kit.startingPrice).toBe(96.7);
    expect(getShippingProgress(kit.startingPrice, 99)).toMatchObject({ remaining: 2.3, eligible: false });
    expect(getShippingProgress(99, 99)).toMatchObject({ remaining: 0, eligible: true, percent: 100 });
    expect(getShippingProgress(96.7, 120).remaining).toBe(23.3);
  });

  it('usa promoção e menor variação ativa disponível sem ignorar acréscimos obrigatórios', () => {
    const product = kitProduct('Vaso', 90, { sale_price: 80, fulfillment_mode: 'ready_stock', product_options: [
      kitOption({ active: false, price_modifier: -30 }), kitOption({ stock: 0, price_modifier: 0 }),
      kitOption({ price_modifier: 15 }), kitOption({ price_modifier: 5 }),
    ] });
    expect(getStartingPrice(product)).toBe(85);
    expect(getStartingPrice({ ...product, sale_price: 0 })).toBe(5);
  });

  it('oculta o kit inteiro quando uma peça está ausente ou indisponível', () => {
    const products = setupProducts();
    expect(buildProductKits(products.slice(1))).toEqual([]);
    for (const overrides of [{ active: false }, { type: 'digital' as const }, { is_wholesale: true }, { category: 'encomenda' }, { fulfillment_mode: 'ready_stock' as const }]) {
      expect(buildProductKits([{ ...products[0], ...overrides }, ...products.slice(1)])).toEqual([]);
    }
  });

  it('aceita produtos sob demanda sem estoque e monta temas com acentos', () => {
    const kits = buildProductKits([
      kitProduct('Organizador Coração', 49.9), kitProduct('Chaveiro Lip Balm', 20.9), kitProduct('Mochilhinha com Gatinho', 25.9),
      kitProduct('Vaso Curvas Modernas', 89.9, { product_options: [kitOption({ stock: 0 })] }),
    ]);
    expect(kits.map(kit => [kit.slug, kit.startingPrice])).toEqual([['penteadeira', 96.7], ['decoracao', 110.8]]);
    expect(getShippingProgress(kits[1].startingPrice, 99).eligible).toBe(true);
  });

  it('usa exatamente os produtos e a ordem escolhidos no painel', () => {
    const products = [kitProduct('Primeiro', 10), kitProduct('Segundo', 20), kitProduct('Terceiro', 30)];
    const [kit] = buildProductKits(products, [{
      slug: 'personalizado', title: 'Kit personalizado', eyebrow: 'Escolhido no painel', description: 'Descrição', tone: 'pink',
      productIds: ['Terceiro', 'Primeiro'], active: true,
    }]);

    expect(kit.products.map(product => product.id)).toEqual(['Terceiro', 'Primeiro']);
    expect(kit.startingPrice).toBe(40);
  });

  it('prioriza o complemento mais barato que atinge o frete e exclui itens do carrinho', () => {
    const products = [kitProduct('Boca', 6.9), kitProduct('Lip Balm', 20.9), kitProduct('Vaso', 89.9), kitProduct('STL', 10, { type: 'digital' })];
    expect(selectComplementaryProducts(products, ['Vaso'], 9.1).map(product => product.name)).toEqual(['Lip Balm', 'Boca']);
    expect(getShippingProgress(89.9 + 6.9, 99).eligible).toBe(false);
    expect(getShippingProgress(89.9 + 20.9, 99).eligible).toBe(true);
    expect(selectComplementaryProducts(products, ['Vaso'], 0)[0].name).toBe('Boca');
  });
});
