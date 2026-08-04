import type { ProductEditorState } from '../types';

export type SectionValidationResult = {
  sectionName: string;
  isValid: boolean;
  error?: string;
  warning?: string;
};

export const validationService = {
  validateBasicInfo(state: ProductEditorState): SectionValidationResult {
    if (!state.name.trim()) {
      return { sectionName: 'basicInfo', isValid: false, error: 'Nome é obrigatório' };
    }
    if (state.name.length > 120) {
      return {
        sectionName: 'basicInfo',
        isValid: false,
        error: 'Nome deve ter no máximo 120 caracteres',
      };
    }
    if (state.description.length > 1000) {
      return {
        sectionName: 'basicInfo',
        isValid: false,
        error: 'Descrição deve ter no máximo 1000 caracteres',
      };
    }
    return { sectionName: 'basicInfo', isValid: true };
  },

  validateImages(state: ProductEditorState): SectionValidationResult {
    if (state.images.length === 0) {
      return { sectionName: 'images', isValid: false, error: 'Adicione pelo menos 1 imagem' };
    }
    if (state.images.length > 6) {
      return { sectionName: 'images', isValid: false, error: 'Máximo 6 imagens permitidas' };
    }
    return { sectionName: 'images', isValid: true };
  },

  validatePricing(state: ProductEditorState): SectionValidationResult {
    if (state.basePrice <= 0) {
      return {
        sectionName: 'pricing',
        isValid: false,
        error: 'Preço base deve ser maior que zero',
      };
    }

    if (state.salePrice !== null && state.salePrice <= 0) {
      return {
        sectionName: 'pricing',
        isValid: false,
        error: 'Preço promocional deve ser maior que zero',
      };
    }

    if (state.salePrice !== null && state.salePrice >= state.basePrice) {
      return {
        sectionName: 'pricing',
        isValid: false,
        error: 'Preço promocional deve ser menor que o preço base',
      };
    }

    if (state.costPrice !== null && state.costPrice <= 0) {
      return {
        sectionName: 'pricing',
        isValid: false,
        error: 'Preço de custo deve ser maior que zero',
      };
    }

    if (state.costPrice !== null && state.costPrice >= state.basePrice) {
      return {
        sectionName: 'pricing',
        isValid: false,
        error: 'Preço de custo deve ser menor que o preço base',
      };
    }

    if (state.isWholesale) {
      if (
        !Number.isInteger(state.minimumOrderQuantity) ||
        state.minimumOrderQuantity < 2 ||
        state.minimumOrderQuantity > 999
      ) {
        return {
          sectionName: 'pricing',
          isValid: false,
          error: 'Quantidade mínima deve ser entre 2 e 999',
        };
      }
    }

    // Margin warning
    if (state.costPrice !== null) {
      const margin = ((state.basePrice - state.costPrice) / state.basePrice) * 100;
      if (margin < 20) {
        return {
          sectionName: 'pricing',
          isValid: true,
          warning: `Margem baixa: ${margin.toFixed(1)}%. Recomendado mínimo 20%`,
        };
      }
    }

    return { sectionName: 'pricing', isValid: true };
  },

  validateVariations(state: ProductEditorState): SectionValidationResult {
    if (state.variations.length === 0) {
      return { sectionName: 'variations', isValid: true };
    }

    for (const variation of state.variations) {
      if (!variation.name.trim() && !variation.color) {
        return {
          sectionName: 'variations',
          isValid: false,
          error: 'Cada variação deve ter um nome ou uma cor',
        };
      }

      if (!Number.isFinite(variation.priceModifier)) {
        return {
          sectionName: 'variations',
          isValid: false,
          error: 'Preço adicional das variações inválido',
        };
      }

      if (!Number.isInteger(variation.stock) || variation.stock < 0) {
        return {
          sectionName: 'variations',
          isValid: false,
          error: 'Estoque deve ser um inteiro não-negativo',
        };
      }

      if (variation.priceModifier < -state.basePrice) {
        return {
          sectionName: 'variations',
          isValid: false,
          error: 'Preço adicional não pode resultar em preço negativo',
        };
      }

      if (variation.color && !/^#[0-9A-F]{6}([0-9A-F]{2})?$/i.test(variation.color)) {
        return {
          sectionName: 'variations',
          isValid: false,
          error: 'Cor deve estar em formato hexadecimal válido',
        };
      }
    }

    return { sectionName: 'variations', isValid: true };
  },

  validateCustomization(state: ProductEditorState): SectionValidationResult {
    if (!state.isCustomizable) {
      return { sectionName: 'customization', isValid: true };
    }

    if (!state.customizationQuestion.trim()) {
      return {
        sectionName: 'customization',
        isValid: false,
        error: 'Pergunta de personalização é obrigatória',
      };
    }

    if (!state.customizationHelpText.trim()) {
      return {
        sectionName: 'customization',
        isValid: false,
        error: 'Texto de ajuda é obrigatório',
      };
    }

    if (!state.customizationPlaceholder.trim()) {
      return {
        sectionName: 'customization',
        isValid: false,
        error: 'Placeholder é obrigatório',
      };
    }

    if (state.customizationSections.length > 10) {
      return {
        sectionName: 'customization',
        isValid: false,
        error: 'Máximo 10 seções de personalização',
      };
    }

    const labels = state.customizationSections.map((s) => s.label);
    if (new Set(labels).size !== labels.length) {
      return {
        sectionName: 'customization',
        isValid: false,
        error: 'Cada seção deve ter um label único',
      };
    }

    return { sectionName: 'customization', isValid: true };
  },

  validateAll(state: ProductEditorState): SectionValidationResult[] {
    return [
      this.validateBasicInfo(state),
      this.validateImages(state),
      this.validatePricing(state),
      this.validateVariations(state),
      this.validateCustomization(state),
    ];
  },
};
