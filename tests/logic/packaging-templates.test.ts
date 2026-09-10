import { describe, expect, it } from 'vitest';
import {
  getPackagingNetSize,
  getPackagingPlacements,
  getPackagingSheetSize,
  PACKAGING_TEMPLATES,
} from '@/lib/packaging-templates';

describe('packaging templates', () => {
  it('keeps every cutting net inside its A4 sheet', () => {
    for (const template of PACKAGING_TEMPLATES) {
      const sheet = getPackagingSheetSize(template);
      const net = getPackagingNetSize(template);
      const placements = getPackagingPlacements(template);

      expect(placements).toHaveLength(template.copies);
      for (const placement of placements) {
        expect(placement.x).toBeGreaterThanOrEqual(0);
        expect(placement.y).toBeGreaterThanOrEqual(0);
        expect(placement.x + net.width).toBeLessThanOrEqual(sheet.width);
        expect(placement.y + net.height).toBeLessThanOrEqual(sheet.height);
      }
    }
  });

  it('fits two keychain boxes on one portrait A4 page', () => {
    const template = PACKAGING_TEMPLATES[0];
    expect(template.id).toBe('keychain');
    expect(template.copies).toBe(2);
    expect(template.orientation).toBe('portrait');
  });

  it('orders the models from smallest to largest', () => {
    const volumes = PACKAGING_TEMPLATES.map(({ width, depth, height }) => width * depth * height);
    expect(volumes).toEqual([...volumes].sort((a, b) => a - b));
  });
});

