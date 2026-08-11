import { describe, expect, it } from 'vitest';
import { parseMelhorEnvioQuotes, sanitizeCep } from '@/lib/shipping';

describe('Melhor Envio shipping quotes', () => {
  it('uses the final custom price and delivery time for PAC and SEDEX', () => {
    expect(parseMelhorEnvioQuotes([
      { id: 1, name: 'PAC', price: '29.90', custom_price: '21.47', delivery_time: 7, custom_delivery_time: 8, company: { name: 'Correios' } },
      { id: 2, name: 'SEDEX', price: '45.00', custom_price: '35.12', delivery_time: 3, custom_delivery_time: 4, company: { name: 'Correios' } },
    ])).toEqual([
      { id: 'pac', name: 'Correios PAC', price: 21.47, days_min: 8, days_max: 8 },
      { id: 'sedex', name: 'Correios SEDEX', price: 35.12, days_min: 4, days_max: 4 },
    ]);
  });

  it('ignores unavailable services and unrelated carriers', () => {
    expect(parseMelhorEnvioQuotes([
      { id: 1, name: 'PAC', error: 'Serviço indisponível' },
      { id: 3, name: '.Package', custom_price: '18.00', custom_delivery_time: 5, company: { name: 'Jadlog' } },
    ])).toEqual([]);
  });

  it('keeps the cheapest quote when the API returns duplicate services', () => {
    const options = parseMelhorEnvioQuotes([
      { name: 'PAC', custom_price: '25.00', custom_delivery_time: 6 },
      { name: 'PAC Mini', custom_price: '19.90', custom_delivery_time: 8 },
    ]);
    expect(options).toEqual([{ id: 'pac', name: 'PAC Mini', price: 19.9, days_min: 8, days_max: 8 }]);
  });
});

describe('sanitizeCep', () => {
  it('accepts formatted CEPs', () => expect(sanitizeCep('89000-123')).toBe('89000123'));
  it('rejects incomplete CEPs', () => expect(sanitizeCep('8900')).toBeNull());
});
