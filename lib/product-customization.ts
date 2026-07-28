export const DEFAULT_CUSTOMIZATION_COPY = {
  question: 'Como você quer personalizar?',
  helpText: 'Escreva o nome, frase ou orientação que devemos seguir na produção.',
  placeholder: 'Ex.: Nome Helena, com a primeira letra maiúscula',
} as const;

export type ProductCustomizationCopyInput = {
  customization_question?: string | null;
  customization_help_text?: string | null;
  customization_placeholder?: string | null;
};

const FIELD_LIMITS = {
  customization_question: 120,
  customization_help_text: 300,
  customization_placeholder: 180,
} as const;

export function normalizeProductCustomizationCopy(
  input: ProductCustomizationCopyInput,
) {
  const normalized: ProductCustomizationCopyInput = {};

  for (const field of Object.keys(FIELD_LIMITS) as Array<keyof typeof FIELD_LIMITS>) {
    const value = input[field];
    if (value === undefined) continue;
    if (value !== null && typeof value !== 'string') {
      throw new Error('Textos de personalização inválidos');
    }

    const text = value?.trim() ?? null;
    if (text !== null && text.length > FIELD_LIMITS[field]) {
      throw new Error(`O campo de personalização deve ter no máximo ${FIELD_LIMITS[field]} caracteres`);
    }
    normalized[field] = text;
  }

  return normalized;
}
