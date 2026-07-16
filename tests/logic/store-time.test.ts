import { describe, expect, it } from 'vitest';
import {
  formatStoreDateTime,
  getStoreDateGroupKey,
  getStoreDateKey,
  getStoreDayBounds,
  getStoreMonthBounds,
} from '@/lib/store-time';

describe('fuso horário comercial da loja', () => {
  const lateNightInSaoPaulo = new Date('2026-07-16T02:30:00.000Z');

  it('mantém o dia 15 enquanto ainda é dia 15 em São Paulo', () => {
    expect(getStoreDateKey(lateNightInSaoPaulo)).toBe('2026-07-15');
    expect(formatStoreDateTime(lateNightInSaoPaulo, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })).toBe('15/07/2026');
  });

  it('calcula o intervalo completo do dia local para consultas no banco', () => {
    const bounds = getStoreDayBounds(lateNightInSaoPaulo);

    expect(bounds.start.toISOString()).toBe('2026-07-15T03:00:00.000Z');
    expect(bounds.endExclusive.toISOString()).toBe('2026-07-16T03:00:00.000Z');
  });

  it('agrupa pedidos pelo dia, semana e mês locais', () => {
    expect(getStoreDateGroupKey(lateNightInSaoPaulo, 'day')).toBe('2026-07-15');
    expect(getStoreDateGroupKey(lateNightInSaoPaulo, 'week')).toBe('2026-07-13');
    expect(getStoreDateGroupKey(lateNightInSaoPaulo, 'month')).toBe('2026-07');
  });

  it('calcula os limites mensais no fuso da loja', () => {
    const bounds = getStoreMonthBounds(lateNightInSaoPaulo);

    expect(bounds.previousStart.toISOString()).toBe('2026-06-01T03:00:00.000Z');
    expect(bounds.start.toISOString()).toBe('2026-07-01T03:00:00.000Z');
    expect(bounds.nextStart.toISOString()).toBe('2026-08-01T03:00:00.000Z');
  });
});
