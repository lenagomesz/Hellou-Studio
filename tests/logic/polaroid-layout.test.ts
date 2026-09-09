import { describe, expect, it } from 'vitest';
import {
  getPolaroidPrintSummary,
  paginatePolaroids,
  POLAROIDS_PER_A4_PAGE,
} from '@/lib/polaroid-layout';

describe('polaroid A4 layout', () => {
  it('fits up to nine polaroids on one A4 page', () => {
    expect(POLAROIDS_PER_A4_PAGE).toBe(9);
    expect(paginatePolaroids(Array.from({ length: 8 }, (_, index) => index))).toHaveLength(1);
  });

  it('creates more pages without losing or duplicating photos', () => {
    const items = Array.from({ length: 16 }, (_, index) => index);
    const pages = paginatePolaroids(items);

    expect(pages.map((page) => page.length)).toEqual([9, 7]);
    expect(pages.flat()).toEqual(items);
  });

  it('reports pages and free slots', () => {
    expect(getPolaroidPrintSummary(0)).toEqual({ count: 0, pages: 0, remainingSlots: 9 });
    expect(getPolaroidPrintSummary(8)).toEqual({ count: 8, pages: 1, remainingSlots: 1 });
    expect(getPolaroidPrintSummary(16)).toEqual({ count: 16, pages: 2, remainingSlots: 2 });
  });
});
