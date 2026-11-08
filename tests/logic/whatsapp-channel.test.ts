import { describe, expect, it } from 'vitest';
import { chooseProduct, productLink, productPrice, slotForDate, weekdayForDate } from '@/lib/whatsapp-channel';

describe('programação do Canal WhatsApp', () => {
  it('usa o preço promocional somente quando ele é válido', () => {
    expect(productPrice({ base_price: 39.9, sale_price: 29.9 })).toBe(29.9);
    expect(productPrice({ base_price: 39.9, sale_price: 49.9 })).toBe(39.9);
    expect(productPrice({ base_price: 39.9, sale_price: null })).toBe(39.9);
  });

  it('cria links para produtos reais com slug ou ID', () => {
    expect(productLink({ slug: 'presente-natal', id: 'id-1' })).toBe('https://helloustudio.com.br/products/presente-natal');
    expect(productLink({ slug: null, id: 'id-1' })).toBe('https://helloustudio.com.br/products/id-1');
  });

  it('escolhe novidade sem repetir produtos divulgados recentemente', () => {
    const products = [
      { id: 'new', created_at: '2026-11-08T12:00:00Z' },
      { id: 'old', created_at: '2026-11-01T12:00:00Z' },
    ];
    expect(chooseProduct(products as never, new Set(['new']))?.id).toBe('old');
    expect(chooseProduct(products as never, new Set(['new', 'old']))).toBeNull();
  });

  it('programa pelo dia e horário de Brasília', () => {
    const date = new Date('2026-11-09T15:00:00Z');
    expect(weekdayForDate(date)).toBe(1);
    expect(slotForDate(date, '10:00')).toBe('2026-11-09T13:00:00.000Z');
  });
});
