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

export type ProductCustomizationSectionType = 'color' | 'text' | 'color_text';

export type ProductCustomizationColor = {
  id: string;
  label: string;
  value: string;
};

export type ProductCustomizationSection = {
  id: string;
  label: string;
  type: ProductCustomizationSectionType;
  required: boolean;
  helpText: string;
  placeholder: string;
  colors: ProductCustomizationColor[];
};

export type ProductCustomizationSelection = {
  colorId?: string;
  colorLabel?: string;
  colorValue?: string;
  text?: string;
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

const SECTION_TYPES = new Set<ProductCustomizationSectionType>(['color', 'text', 'color_text']);

function normalizeIdentifier(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
  return normalized || fallback;
}

export function normalizeProductCustomizationSections(input: unknown): ProductCustomizationSection[] {
  if (input == null) return [];
  if (!Array.isArray(input)) throw new Error('As seções de personalização são inválidas');
  if (input.length > 10) throw new Error('Cadastre no máximo 10 seções de personalização');

  const sectionIds = new Set<string>();
  return input.map((rawSection, sectionIndex) => {
    if (!rawSection || typeof rawSection !== 'object') {
      throw new Error('Revise as seções de personalização');
    }

    const section = rawSection as Record<string, unknown>;
    const id = normalizeIdentifier(section.id, `section-${sectionIndex + 1}`);
    if (sectionIds.has(id)) throw new Error('Cada seção de personalização deve ser única');
    sectionIds.add(id);

    const label = typeof section.label === 'string' ? section.label.trim() : '';
    if (!label) throw new Error(`Informe o título da seção ${sectionIndex + 1}`);
    if (label.length > 80) throw new Error('O título da seção deve ter no máximo 80 caracteres');

    const type = section.type;
    if (typeof type !== 'string' || !SECTION_TYPES.has(type as ProductCustomizationSectionType)) {
      throw new Error(`Escolha o tipo da seção "${label}"`);
    }

    const helpText = typeof section.helpText === 'string' ? section.helpText.trim() : '';
    const placeholder = typeof section.placeholder === 'string' ? section.placeholder.trim() : '';
    if (helpText.length > 160 || placeholder.length > 160) {
      throw new Error('Orientações e exemplos devem ter no máximo 160 caracteres');
    }

    const needsColors = type === 'color' || type === 'color_text';
    const rawColors = Array.isArray(section.colors) ? section.colors : [];
    if (rawColors.length > 20) throw new Error(`Cadastre no máximo 20 cores em "${label}"`);

    const colorIds = new Set<string>();
    const colors = needsColors
      ? rawColors.map((rawColor, colorIndex) => {
          if (!rawColor || typeof rawColor !== 'object') {
            throw new Error(`Revise as cores de "${label}"`);
          }
          const color = rawColor as Record<string, unknown>;
          const colorId = normalizeIdentifier(color.id, `${id}-color-${colorIndex + 1}`);
          if (colorIds.has(colorId)) throw new Error(`As cores de "${label}" devem ser únicas`);
          colorIds.add(colorId);
          const colorLabel = typeof color.label === 'string' ? color.label.trim() : '';
          const colorValue = typeof color.value === 'string' ? color.value.trim() : '';
          if (!colorLabel || !colorValue) throw new Error(`Preencha o nome e a cor em "${label}"`);
          if (colorLabel.length > 50 || colorValue.length > 40) {
            throw new Error(`Revise os dados de cor em "${label}"`);
          }
          return { id: colorId, label: colorLabel, value: colorValue };
        })
      : [];

    if (needsColors && colors.length === 0) {
      throw new Error(`Adicione pelo menos uma cor em "${label}"`);
    }

    return {
      id,
      label,
      type: type as ProductCustomizationSectionType,
      required: section.required !== false,
      helpText,
      placeholder,
      colors,
    };
  });
}

export function formatProductCustomizationSelections(
  sections: ProductCustomizationSection[],
  selections: Record<string, ProductCustomizationSelection>,
) {
  return sections
    .map((section) => {
      const selection = selections[section.id] ?? {};
      const parts: string[] = [];
      if (section.type === 'color' || section.type === 'color_text') {
        const selectedColor = section.colors.find((color) => color.id === selection.colorId);
        if (selectedColor) parts.push(`Cor: ${selectedColor.label}`);
      }
      if ((section.type === 'text' || section.type === 'color_text') && selection.text?.trim()) {
        parts.push(`Texto: ${selection.text.trim()}`);
      }
      return parts.length > 0 ? `${section.label}: ${parts.join(' · ')}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

export function areRequiredCustomizationSectionsComplete(
  sections: ProductCustomizationSection[],
  selections: Record<string, ProductCustomizationSelection>,
) {
  return sections.every((section) => {
    if (!section.required) return true;
    const selection = selections[section.id] ?? {};
    const hasColor = Boolean(selection.colorId && section.colors.some((color) => color.id === selection.colorId));
    const hasText = Boolean(selection.text?.trim());
    if (section.type === 'color') return hasColor;
    if (section.type === 'text') return hasText;
    return hasColor && hasText;
  });
}

export function parseProductCustomizationSelections(
  sections: ProductCustomizationSection[],
  value: string,
) {
  const selections: Record<string, ProductCustomizationSelection> = {};
  for (const section of sections) {
    const line = value.split('\n').find((item) => item.startsWith(`${section.label}: `));
    if (!line) continue;
    const content = line.slice(section.label.length + 2);
    const colorMatch = /(?:^| · )Cor: ([^·]+)/.exec(content);
    const textMatch = /(?:^| · )Texto: (.+)$/.exec(content);
    const colorLabel = colorMatch?.[1]?.trim();
    const color = colorLabel
      ? section.colors.find((item) => item.label.toLocaleLowerCase('pt-BR') === colorLabel.toLocaleLowerCase('pt-BR'))
      : undefined;
    selections[section.id] = {
      ...(color ? { colorId: color.id, colorLabel: color.label, colorValue: color.value } : {}),
      ...(textMatch?.[1] ? { text: textMatch[1].trim() } : {}),
    };
  }
  return selections;
}
