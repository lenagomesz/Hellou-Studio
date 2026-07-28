import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CUSTOMIZATION_COPY,
  normalizeProductCustomizationCopy,
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
});
