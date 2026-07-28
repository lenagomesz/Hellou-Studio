import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CUSTOMIZATION_COPY,
  areRequiredCustomizationSectionsComplete,
  formatProductCustomizationSelections,
  normalizeProductCustomizationCopy,
  normalizeProductCustomizationSections,
  parseProductCustomizationSelections,
} from '@/lib/product-customization';

describe('product customization copy', () => {
  it('keeps omitted fields unchanged', () => {
    expect(normalizeProductCustomizationCopy({})).toEqual({});
  });

  it('trims configured copy and preserves an intentionally empty optional field', () => {
    expect(normalizeProductCustomizationCopy({
      customization_question: `  ${DEFAULT_CUSTOMIZATION_COPY.question}  `,
      customization_help_text: '   ',
      customization_placeholder: '  Digite o nome  ',
    })).toEqual({
      customization_question: DEFAULT_CUSTOMIZATION_COPY.question,
      customization_help_text: '',
      customization_placeholder: 'Digite o nome',
    });
  });

  it('rejects copy above the database limits', () => {
    expect(() => normalizeProductCustomizationCopy({
      customization_question: 'a'.repeat(121),
    })).toThrow('no máximo 120 caracteres');
  });

  it('normalizes independent color, text and combined sections', () => {
    expect(normalizeProductCustomizationSections([
      {
        id: 'base',
        label: 'Cor da base',
        type: 'color',
        required: true,
        colors: [{ id: 'blue', label: 'Azul', value: '#123456' }],
      },
      {
        id: 'name',
        label: 'Nome',
        type: 'text',
        required: true,
        placeholder: 'Ex.: Helena',
      },
    ])).toEqual([
      {
        id: 'base',
        label: 'Cor da base',
        type: 'color',
        required: true,
        helpText: '',
        placeholder: '',
        colors: [{ id: 'blue', label: 'Azul', value: '#123456' }],
      },
      {
        id: 'name',
        label: 'Nome',
        type: 'text',
        required: true,
        helpText: '',
        placeholder: 'Ex.: Helena',
        colors: [],
      },
    ]);
  });

  it('formats, validates and restores the customer selections', () => {
    const sections = normalizeProductCustomizationSections([
      {
        id: 'keys',
        label: 'Cor das teclas',
        type: 'color_text',
        required: true,
        colors: [{ id: 'pink', label: 'Rosa', value: '#ff6699' }],
      },
    ]);
    const selections = { keys: { colorId: 'pink', text: 'HELENA' } };
    const formatted = formatProductCustomizationSelections(sections, selections);

    expect(areRequiredCustomizationSectionsComplete(sections, selections)).toBe(true);
    expect(formatted).toBe('Cor das teclas: Cor: Rosa · Texto: HELENA');
    expect(parseProductCustomizationSelections(sections, formatted)).toEqual({
      keys: {
        colorId: 'pink',
        colorLabel: 'Rosa',
        colorValue: '#ff6699',
        text: 'HELENA',
      },
    });
  });
});
