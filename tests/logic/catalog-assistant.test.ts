import { describe, expect, it } from 'vitest';
import { buildCatalogImagePrompt, calculateCatalogPrice, commercialPrice } from '@/lib/catalog-assistant';

describe('assistente de catálogo', () => {
  it('calcula o exemplo do prompt com a fórmula comercial', () => {
    expect(calculateCatalogPrice({
      weightGrams: 113.69,
      hours: 4,
      minutes: 29,
      filamentPricePerKg: 100,
    })).toEqual({
      peso_g: 113.69,
      tempo_impressao: '4h29m',
      preco_filamento_kg: 100,
      custo_filamento: 11.37,
      custo_operacional: 5.38,
      custo_embalagem: 1.14,
      custo_total: 17.89,
      multiplicador: 2.1,
      valor_bruto: 37.56,
      valor_sugerido: 39.9,
    });
  });

  it.each([
    [37.56, 39.9],
    [43.1, 44.9],
    [67.2, 69.9],
  ])('arredonda %s para um preço terminado em ,90', (input, expected) => {
    expect(commercialPrice(input)).toBe(expected);
  });

  it('adiciona a troca de cor sem alterar o restante do prompt visual', () => {
    const prompt = buildCatalogImagePrompt('Preto');
    expect(prompt).toContain('#C6843A');
    expect(prompt).toContain('Altere somente a cor do produto para Preto');
  });
});
