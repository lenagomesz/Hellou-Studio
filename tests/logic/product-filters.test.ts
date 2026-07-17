import { describe, expect, it } from 'vitest';
import { parseOptionalPrice } from '@/lib/product-filters';

describe('filtros de preço dos produtos', () => {
  it('não transforma filtro ausente em preço zero', () => {
    expect(parseOptionalPrice(null)).toBeUndefined();
    expect(parseOptionalPrice('')).toBeUndefined();
    expect(parseOptionalPrice('   ')).toBeUndefined();
  });

  it('aceita zero quando informado explicitamente', () => {
    expect(parseOptionalPrice('0')).toBe(0);
  });

  it('aceita preços válidos e ignora valores inválidos', () => {
    expect(parseOptionalPrice('49.90')).toBe(49.9);
    expect(parseOptionalPrice('qualquer')).toBeUndefined();
    expect(parseOptionalPrice('-10')).toBeUndefined();
  });
});
