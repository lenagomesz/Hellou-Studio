import { describe, expect, it } from 'vitest';
import { getProductColorName, getProductColorValue, normalizeProductColor } from '@/lib/product-colors';

describe('product color standardization', () => {
  it.each([
    ['Rosa', '#EC4899'],
    ['#ec4899', '#EC4899'],
    ['rgb(236, 72, 153)', '#EC4899'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeProductColor(input)).toBe(expected);
  });

  it('renders legacy Portuguese color names correctly', () => {
    expect(getProductColorValue('Rosa')).toBe('#EC4899');
    expect(getProductColorName('Rosa')).toBe('Rosa');
  });

  it('rejects arbitrary text that browsers cannot render as a color', () => {
    expect(normalizeProductColor('rosa chiclete especial')).toBeNull();
  });
});
