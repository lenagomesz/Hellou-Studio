import { describe, expect, it } from 'vitest';
import type { ProductOption } from '@/types/database';
import type { ProductCustomizationSection } from '@/lib/product-customization';
import {
  filterAvailableProductOptions,
  resolveEffectiveCustomizationSections,
  validateCustomizationChoices,
  type CatalogColor,
  type Step,
  type StepLink,
} from '@/lib/catalog-availability';

const pink: CatalogColor = { id: 'pink', name: 'Rosa', hex: '#EC4899', active: true, created_at: '2026-10-01' };
const blue: CatalogColor = { id: 'blue', name: 'Azul', hex: '#3B82F6', active: true, created_at: '2026-10-01' };
const section: ProductCustomizationSection = {
  id: 'step-shared', label: 'Cor do corpo', type: 'color', required: true,
  autoSelectOptionByCharacterCount: false, helpText: '', placeholder: '',
  colors: [
    { id: 'pink-choice', colorId: 'pink', label: 'Rosa', value: '#EC4899' },
    { id: 'blue-choice', colorId: 'blue', label: 'Azul', value: '#3B82F6' },
  ], options: [],
};
const step: Step = { id: 'shared', name: 'Cor do corpo', description: '', definition: section, active: true };
const link = (product_id: string, blocked_ids: string[] = []): StepLink => ({
  product_id, step_id: 'shared', sort_order: 10, required: true, active: true, blocked_ids,
});

describe('disponibilidade do catálogo', () => {
  it('propaga uma cor globalmente inativa a produtos que compartilham a etapa', () => {
    const unavailable = { ...pink, active: false };
    const first = resolveEffectiveCustomizationSections([], [unavailable, blue], [link('a')], [step]);
    const second = resolveEffectiveCustomizationSections([], [unavailable, blue], [link('b')], [step]);
    expect(first[0].colors.map((color) => color.label)).toEqual(['Azul']);
    expect(second[0].colors.map((color) => color.label)).toEqual(['Azul']);
    expect(validateCustomizationChoices(first, 'Cor do corpo: Cor: Rosa')).toBe(false);
    expect(resolveEffectiveCustomizationSections([], [pink, blue], [link('a')], [step])[0].colors).toHaveLength(2);
  });

  it('mantém um bloqueio individual e uma etapa exclusiva sem afetar outro produto', () => {
    const exclusive = { ...section, id: 'exclusive', label: 'Cor do detalhe' };
    const first = resolveEffectiveCustomizationSections([exclusive], [pink, blue], [link('a', ['pink-choice'])], [step]);
    const second = resolveEffectiveCustomizationSections([], [pink, blue], [link('b')], [step]);
    expect(first.map((item) => item.label)).toEqual(['Cor do detalhe', 'Cor do corpo']);
    expect(first[1].colors.map((item) => item.label)).toEqual(['Azul']);
    expect(second[0].colors.map((item) => item.label)).toEqual(['Rosa', 'Azul']);
    const exhausted = resolveEffectiveCustomizationSections([], [pink, blue], [link('a', ['pink-choice', 'blue-choice'])], [step]);
    expect(exhausted[0].availabilityExhausted).toBe(true);
    expect(exhausted[0].colors).toEqual([]);
  });

  it('inativa a etapa compartilhada sem apagar o vínculo e rejeita escolha antiga', () => {
    const sections = resolveEffectiveCustomizationSections([], [pink, blue], [link('a')], [{ ...step, active: false }]);
    expect(sections[0].available).toBe(false);
    expect(validateCustomizationChoices(sections, 'Cor do corpo: Cor: Rosa')).toBe(false);
  });

  it('mantém a identidade da cor após alterar seu hexadecimal global', () => {
    const colorId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const oldSection = { ...section, colors: [{ id: 'pink-choice', colorId, label: 'Rosa antiga', value: '#EC4899' }] };
    const currentColor = { ...pink, id: colorId, name: 'Rosa novo', hex: '#FF77AA' };
    const resolved = resolveEffectiveCustomizationSections([oldSection], [currentColor], [], []);
    expect(resolved[0].colors[0]).toMatchObject({ colorId, label: 'Rosa novo', value: '#FF77AA' });
  });

  it('exige disponibilidade global, do grupo e da variação comercial', () => {
    const option = (id: string, active: boolean, color_preset_item_id: string | null): ProductOption => ({
      id, active, color_preset_item_id, catalog_color_id: 'pink', color: '#EC4899', color_name: 'Rosa',
    } as ProductOption);
    const options = [option('a', true, 'preset'), option('b', false, 'preset')];
    expect(filterAvailableProductOptions(options, [pink], [{ id: 'preset', active: true, catalog_color_id: 'pink' }]).map((item) => item.id)).toEqual(['a']);
    expect(filterAvailableProductOptions(options, [{ ...pink, active: false }], [{ id: 'preset', active: true, catalog_color_id: 'pink' }])).toEqual([]);
    expect(filterAvailableProductOptions(options, [pink], [{ id: 'preset', active: false, catalog_color_id: 'pink' }])).toEqual([]);
  });
});
