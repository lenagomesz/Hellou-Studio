import { describe, expect, it } from 'vitest';
import { getProduct3DSelection } from '@/lib/product-3d';
import { normalizeProductCustomizationSections } from '@/lib/product-customization';

const sections = normalizeProductCustomizationSections([
  { id: 'model', label: 'Modelo', type: 'option', options: [
    { id: 'tree', label: 'Pinheiro', model3dUrl: '/tree.glb' },
    { id: 'star', label: 'Estrela', model3dUrl: '/star.glb' },
    { id: 'missing', label: 'Sem modelo' },
  ] },
  { id: 'color', label: 'Cor', type: 'color', colors: [{ id: 'pink', label: 'Rosa', value: '#EC4899' }] },
]);

describe('product 3D selection', () => {
  it('preserves per-choice models through normalization and switches geometry and color', () => {
    expect(getProduct3DSelection('/default.glb', sections, {
      model: { optionId: 'star' }, color: { colorId: 'pink', colorValue: '#000000' },
    })).toEqual({ modelUrl: '/star.glb', color: '#EC4899' });
  });
  it('does not display another model when the selected option has no geometry', () => {
    expect(getProduct3DSelection('/default.glb', sections, { model: { optionId: 'missing' } }).modelUrl).toBeNull();
  });
  it('ignores unavailable choices and uses commercial colors when no customization color is selected', () => {
    const inactive = normalizeProductCustomizationSections([{ id: 'm', label: 'Modelo', type: 'option', options: [{ id: 's', label: 'Estrela', active: false, model3dUrl: '/star.glb' }] }]);
    expect(getProduct3DSelection('/default.glb', inactive, { m: { optionId: 's' } }, '#123')).toEqual({ modelUrl: '/default.glb', color: '#112233' });
  });
  it('rejects invalid model URLs', () => {
    for (const url of ['javascript:alert(1)', '//other.test/model.glb']) {
      expect(() => normalizeProductCustomizationSections([{ label: 'Modelo', type: 'option', options: [{ label: 'A', model3dUrl: url }] }])).toThrow('modelo 3D');
    }
  });
});
