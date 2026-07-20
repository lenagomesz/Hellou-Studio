import { describe, expect, it } from 'vitest';
import { calculateMarketMargin, summarizeMarket } from '@/lib/market-analysis';

describe('análise de mercado', () => {
  it('calcula estatísticas e identifica preço abaixo da mediana', () => {
    expect(summarizeMarket([39.9, 59.9, 49.9, 69.9], 39.9)).toEqual({
      menor_preco: 39.9,
      maior_preco: 69.9,
      preco_medio: 54.9,
      preco_mediano: 54.9,
      amostra: 4,
      posicao: 'abaixo',
    });
  });

  it('considera competitivo o preço dentro de dez por cento da mediana', () => {
    expect(summarizeMarket([50, 60, 70], 66).posicao).toBe('competitivo');
  });

  it('calcula lucro e margem após custo e taxa de pagamento', () => {
    expect(calculateMarketMargin(100, 40, 5)).toEqual({
      taxa_pagamento: 5,
      lucro_estimado: 55,
      margem_estimada: 55,
    });
  });

  it('não inventa margem quando o custo não foi informado', () => {
    expect(calculateMarketMargin(100, 0, 5)).toBeNull();
  });
});
