import { describe, expect, it } from 'vitest';
import { formatCep, normalizeAddressSearchQuery, parseViaCepAddressResults } from '@/lib/address-search';

describe('address search', () => {
  it('normalizes a valid address query', () => {
    expect(normalizeAddressSearchQuery({ state: ' sc ', city: '  Balneário   Camboriú ', street: ' Rua 1001 ' })).toEqual({
      query: { state: 'SC', city: 'Balneário Camboriú', street: 'Rua 1001' },
    });
  });

  it('requires state, city and street with enough detail', () => {
    expect(normalizeAddressSearchQuery({ state: '', city: 'Itajaí', street: 'Rua A' })).toHaveProperty('error');
    expect(normalizeAddressSearchQuery({ state: 'SC', city: 'It', street: 'Rua A' })).toHaveProperty('error');
    expect(normalizeAddressSearchQuery({ state: 'SC', city: 'Itajaí', street: 'R' })).toHaveProperty('error');
  });

  it('maps only usable ViaCEP results', () => {
    expect(parseViaCepAddressResults([
      { cep: '88330-000', logradouro: 'Avenida Brasil', bairro: 'Centro', localidade: 'Balneário Camboriú', uf: 'SC', complemento: '' },
      { cep: 'inválido', localidade: 'Balneário Camboriú', uf: 'SC' },
    ])).toEqual([{
      cep: '88330000',
      street: 'Avenida Brasil',
      complement: '',
      neighborhood: 'Centro',
      city: 'Balneário Camboriú',
      state: 'SC',
    }]);
  });

  it('formats CEP for display', () => {
    expect(formatCep('88330000')).toBe('88330-000');
  });
});
