import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CUSTOMIZATION_COPY,
  areRequiredCustomizationSectionsComplete,
  countCustomizationLetters,
  findOptionByCharacterCount,
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
        autoSelectOptionByCharacterCount: false,
        helpText: '',
        placeholder: '',
        colors: [{ id: 'blue', label: 'Azul', value: '#123456' }],
        options: [],
      },
      {
        id: 'name',
        label: 'Nome',
        type: 'text',
        required: true,
        autoSelectOptionByCharacterCount: false,
        helpText: '',
        placeholder: 'Ex.: Helena',
        colors: [],
        options: [],
      },
    ]);
  });

  it('normalizes, formats and restores a section with ready options', () => {
    const sections = normalizeProductCustomizationSections([
      {
        id: 'cable',
        label: 'Modelo do cabo',
        type: 'option',
        required: true,
        options: [
          { id: 'lightning', label: 'Lightning' },
          { id: 'usb-c', label: 'USB-C' },
        ],
      },
    ]);
    const selections = { cable: { optionId: 'lightning' } };
    const formatted = formatProductCustomizationSelections(sections, selections);

    expect(sections[0].options).toEqual([
      { id: 'lightning', label: 'Lightning' },
      { id: 'usb-c', label: 'USB-C' },
    ]);
    expect(areRequiredCustomizationSectionsComplete(sections, selections)).toBe(true);
    expect(formatted).toBe('Modelo do cabo: Opção: Lightning');
    expect(parseProductCustomizationSelections(sections, formatted)).toEqual({
      cable: { optionId: 'lightning', optionLabel: 'Lightning' },
    });
  });

  it('counts only letters and selects the matching price variation', () => {
    expect(countCustomizationLetters('Ana Clara-2')).toBe(8);
    expect(findOptionByCharacterCount(
      [{ id: 'five', name: '5 letras' }, { id: 'six', name: '6 letras' }],
      countCustomizationLetters('Helena'),
    )).toEqual({ id: 'six', name: '6 letras' });
  });

  it('allows only one text section to control the option price', () => {
    expect(() => normalizeProductCustomizationSections([
      { id: 'first', label: 'Primeiro nome', type: 'text', autoSelectOptionByCharacterCount: true },
      { id: 'last', label: 'Sobrenome', type: 'text', autoSelectOptionByCharacterCount: true },
    ])).toThrow('Apenas uma seção');
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
