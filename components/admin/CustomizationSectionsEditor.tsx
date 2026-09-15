'use client';

import { useEffect } from 'react';
import { ArrowDown, ArrowUp, GitBranch, Images, ListChecks, Palette, Plus, Trash2, Type } from 'lucide-react';
import type {
  ProductCustomizationColor,
  ProductCustomizationOption,
  ProductCustomizationSection,
  ProductCustomizationSectionType,
  ProductCustomizationVisibility,
} from '@/lib/product-customization';
import { PRODUCT_COLOR_PALETTE } from '@/lib/product-colors';
import { ImageUploadField } from '@/components/admin/ImageUploadField';

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function createColor(): ProductCustomizationColor {
  return {
    id: createId('color'),
    label: 'Nova cor',
    value: '#ec4899',
  };
}

function createPresetColors(): ProductCustomizationColor[] {
  return PRODUCT_COLOR_PALETTE
    .filter((color) => color.hex !== 'transparent')
    .map((color) => ({
      id: createId('color'),
      label: color.name,
      value: color.hex,
    }));
}

function createOption(): ProductCustomizationOption {
  return {
    id: createId('option'),
    label: 'Nova opção',
    imageUrl: '',
  };
}

function createSection(): ProductCustomizationSection {
  return {
    id: createId('section'),
    label: '',
    type: 'color',
    required: true,
    autoSelectOptionByCharacterCount: false,
    helpText: '',
    placeholder: '',
    imageCount: 1,
    colors: createPresetColors(),
    options: [],
  };
}

function usesColor(type: ProductCustomizationSectionType) {
  return type === 'color' || type === 'color_text';
}

function usesText(type: ProductCustomizationSectionType) {
  return type === 'text' || type === 'color_text' || type === 'option_text';
}

function usesOptions(type: ProductCustomizationSectionType) {
  return type === 'option' || type === 'option_text';
}

function sanitizeConditionalSections(sections: ProductCustomizationSection[]) {
  return sections.map((section, sectionIndex) => {
    const condition = section.showWhen;
    if (condition?.source !== 'section_option') return section;
    const sourceIndex = sections.findIndex((candidate) => candidate.id === condition.sectionId);
    const source = sections[sourceIndex];
    const valid = sourceIndex >= 0
      && sourceIndex < sectionIndex
      && usesOptions(source.type)
      && source.options.some((option) => option.id === condition.optionId);
    return valid ? section : { ...section, showWhen: undefined };
  });
}

export function CustomizationSectionsEditor({
  value,
  onChange,
  productOptions = [],
}: {
  value: ProductCustomizationSection[];
  onChange: (sections: ProductCustomizationSection[]) => void;
  productOptions?: Array<{ id: string; name: string }>;
}) {
  useEffect(() => {
    const productOptionIds = new Set(productOptions.map((option) => option.id));
    const hasRemovedCondition = value.some((section) => (
      section.showWhen?.source === 'product_option'
      && !productOptionIds.has(section.showWhen.optionId)
    ));
    if (!hasRemovedCondition) return;
    onChange(value.map((section) => (
      section.showWhen?.source === 'product_option' && !productOptionIds.has(section.showWhen.optionId)
        ? { ...section, showWhen: undefined }
        : section
    )));
  }, [onChange, productOptions, value]);

  function updateSection(index: number, patch: Partial<ProductCustomizationSection>) {
    onChange(sanitizeConditionalSections(value.map((section, currentIndex) => (
      currentIndex === index ? { ...section, ...patch } : section
    ))));
  }

  function moveSection(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= value.length) return;
    const next = [...value];
    [next[index], next[destination]] = [next[destination], next[index]];
    onChange(sanitizeConditionalSections(next));
  }

  function removeSection(index: number) {
    onChange(sanitizeConditionalSections(value.filter((_, currentIndex) => currentIndex !== index)));
  }

  function updateColor(sectionIndex: number, colorIndex: number, patch: Partial<ProductCustomizationColor>) {
    const section = value[sectionIndex];
    updateSection(sectionIndex, {
      colors: section.colors.map((color, currentIndex) => (
        currentIndex === colorIndex ? { ...color, ...patch } : color
      )),
    });
  }

  function updateOption(sectionIndex: number, optionIndex: number, patch: Partial<ProductCustomizationOption>) {
    const section = value[sectionIndex];
    updateSection(sectionIndex, {
      options: (section.options ?? []).map((option, currentIndex) => (
        currentIndex === optionIndex ? { ...option, ...patch } : option
      )),
    });
  }

  function conditionValue(condition?: ProductCustomizationVisibility) {
    if (!condition) return '';
    return condition.source === 'product_option'
      ? `product:${condition.optionId}`
      : `section:${condition.sectionId}:${condition.optionId}`;
  }

  function parseCondition(value: string): ProductCustomizationVisibility | undefined {
    if (!value) return undefined;
    const [source, firstId, secondId] = value.split(':');
    if (source === 'product' && firstId) return { source: 'product_option', optionId: firstId };
    if (source === 'section' && firstId && secondId) {
      return { source: 'section_option', sectionId: firstId, optionId: secondId };
    }
    return undefined;
  }

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/50 dark:bg-violet-950/15 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">Escolhas combináveis</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Seções de variação personalizada</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
            Crie escolhas independentes, como cor da base, cor das teclas, nome ou uma lista de opções prontas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...value, createSection()])}
          disabled={value.length >= 10}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Nova seção
        </button>
      </div>

      {value.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-violet-200 bg-white/80 px-4 py-6 text-center text-xs text-slate-500 dark:border-violet-900 dark:bg-slate-900/60 dark:text-slate-400">
          Nenhuma seção criada. O produto continuará usando apenas o campo de texto geral acima.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {value.map((section, sectionIndex) => {
            const earlierOptionSections = value
              .slice(0, sectionIndex)
              .filter((candidate) => usesOptions(candidate.type));
            const hasConditionalSources = productOptions.length > 0 || earlierOptionSections.some((candidate) => candidate.options.length > 0);

            return (
            <article key={section.id} className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm dark:border-violet-900/60 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                  Seção {sectionIndex + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveSection(sectionIndex, -1)} disabled={sectionIndex === 0} aria-label="Mover seção para cima" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => moveSection(sectionIndex, 1)} disabled={sectionIndex === value.length - 1} aria-label="Mover seção para baixo" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => removeSection(sectionIndex)} aria-label="Excluir seção" className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Título para o cliente *</span>
                  <input
                    value={section.label}
                    onChange={(event) => updateSection(sectionIndex, { label: event.target.value })}
                    maxLength={80}
                    placeholder="Ex.: Cor da base"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Tipo de escolha *</span>
                  <select
                    value={section.type}
                    onChange={(event) => {
                      const type = event.target.value as ProductCustomizationSectionType;
                      updateSection(sectionIndex, {
                        type,
                        colors: usesColor(type) && section.colors.length === 0 ? createPresetColors() : section.colors,
                        options: usesOptions(type) && (section.options ?? []).length === 0 ? [createOption()] : (section.options ?? []),
                        autoSelectOptionByCharacterCount: usesText(type)
                          ? section.autoSelectOptionByCharacterCount
                          : false,
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="color">Somente cor</option>
                    <option value="text">Somente texto</option>
                    <option value="color_text">Cor + texto</option>
                    <option value="option">Somente opção</option>
                    <option value="option_text">Opção + texto</option>
                    <option value="images">Somente envio de fotos</option>
                  </select>
                </label>
              </div>

              <label className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={section.required}
                  onChange={(event) => updateSection(sectionIndex, { required: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                Cliente precisa preencher esta seção
              </label>

              <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 p-3 dark:border-violet-900/50 dark:bg-violet-950/20">
                <label className="block">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <GitBranch className="h-4 w-4 text-violet-500" />
                    Quando esta subvariação deve aparecer?
                  </span>
                  <select
                    value={conditionValue(section.showWhen)}
                    onChange={(event) => updateSection(sectionIndex, { showWhen: parseCondition(event.target.value) })}
                    className="mt-2 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm dark:border-violet-900 dark:bg-slate-950"
                  >
                    <option value="">Sempre visível</option>
                    {productOptions.map((option) => (
                      <option key={`product-${option.id}`} value={`product:${option.id}`}>
                        Quando a variação comercial for “{option.name || 'Sem nome'}”
                      </option>
                    ))}
                    {earlierOptionSections.flatMap((sourceSection) => sourceSection.options.map((option) => (
                      <option key={`section-${sourceSection.id}-${option.id}`} value={`section:${sourceSection.id}:${option.id}`}>
                        Quando “{sourceSection.label || 'Seção anterior'}” for “{option.label}”
                      </option>
                    )))}
                  </select>
                </label>
                {!hasConditionalSources && (
                  <p className="mt-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                    Para criar uma subvariação, adicione antes uma variação comercial ou uma seção do tipo opção.
                  </p>
                )}
                {section.showWhen && (
                  <p className="mt-2 text-[11px] font-medium leading-4 text-violet-700 dark:text-violet-300">
                    Esta seção ficará oculta até o cliente escolher a resposta configurada acima.
                  </p>
                )}
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Orientação opcional</span>
                <input
                  value={section.helpText}
                  onChange={(event) => updateSection(sectionIndex, { helpText: event.target.value })}
                  maxLength={160}
                  placeholder="Ex.: Escolha a cor da parte externa"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              {usesColor(section.type) && (
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Palette className="h-4 w-4 text-violet-500" />
                      Cores disponíveis
                    </span>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => updateSection(sectionIndex, { colors: createPresetColors() })}
                        className="text-xs font-bold text-slate-500 hover:text-violet-700 dark:text-slate-400"
                      >
                        Restaurar cores padrão
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSection(sectionIndex, { colors: [...section.colors, createColor()] })}
                        disabled={section.colors.length >= 20}
                        className="text-xs font-bold text-violet-600 hover:text-violet-700 disabled:opacity-40"
                      >
                        + Adicionar cor
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {section.colors.map((color, colorIndex) => (
                      <div key={color.id} className="grid grid-cols-[2.75rem_1fr_auto] items-center gap-2">
                        <input
                          type="color"
                          value={/^#[0-9a-f]{6}$/i.test(color.value) ? color.value : '#ec4899'}
                          onChange={(event) => updateColor(sectionIndex, colorIndex, { value: event.target.value })}
                          aria-label={`Cor ${colorIndex + 1}`}
                          className="h-9 w-11 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
                        />
                        <input
                          value={color.label}
                          onChange={(event) => updateColor(sectionIndex, colorIndex, { label: event.target.value })}
                          maxLength={50}
                          placeholder="Nome da cor"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => updateSection(sectionIndex, { colors: section.colors.filter((_, index) => index !== colorIndex) })}
                          aria-label={`Excluir cor ${colorIndex + 1}`}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {usesText(section.type) && (
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <Type className="h-4 w-4 text-violet-500" />
                      Exemplo dentro do campo
                    </span>
                    <input
                      value={section.placeholder}
                      onChange={(event) => updateSection(sectionIndex, { placeholder: event.target.value })}
                      maxLength={160}
                      placeholder="Ex.: HELENA"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </label>

                  <label className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                    <input
                      type="checkbox"
                      checked={section.autoSelectOptionByCharacterCount ?? false}
                      onChange={(event) => {
                        if (!event.target.checked) {
                          updateSection(sectionIndex, { autoSelectOptionByCharacterCount: false });
                          return;
                        }
                        onChange(value.map((currentSection, currentIndex) => ({
                          ...currentSection,
                          autoSelectOptionByCharacterCount: currentIndex === sectionIndex,
                        })));
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span>
                      <span className="block text-xs font-bold text-amber-900 dark:text-amber-200">
                        Preço automático pela quantidade de letras
                      </span>
                      <span className="mt-1 block text-[11px] leading-4 text-amber-800/80 dark:text-amber-300/80">
                        Seleciona variações chamadas “3 letras”, “4 letras” etc. Apenas uma seção por produto pode controlar o preço.
                      </span>
                    </span>
                  </label>
                </div>
              )}

              {section.type === 'images' && (
                <label className="mt-4 block rounded-xl border border-pink-100 bg-pink-50/70 p-3 dark:border-pink-900/50 dark:bg-pink-950/20">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Images className="h-4 w-4 text-pink-500" />
                    Quantidade de fotos que o cliente deve enviar
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    step="1"
                    value={section.imageCount ?? 1}
                    onChange={(event) => updateSection(sectionIndex, { imageCount: Number(event.target.value) })}
                    className="mt-2 w-28 rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm dark:border-pink-900 dark:bg-slate-950"
                  />
                  <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">de 1 a 20 imagens</span>
                </label>
              )}

              {usesOptions(section.type) && (
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <ListChecks className="h-4 w-4 text-violet-500" />
                      Opções disponíveis
                    </span>
                    <button
                      type="button"
                      onClick={() => updateSection(sectionIndex, { options: [...(section.options ?? []), createOption()] })}
                      disabled={(section.options ?? []).length >= 20}
                      className="text-xs font-bold text-violet-600 hover:text-violet-700 disabled:opacity-40"
                    >
                      + Adicionar opção
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(section.options ?? []).map((option, optionIndex) => (
                      <div key={option.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-[minmax(0,1fr)_minmax(13rem,0.8fr)_auto] sm:items-end">
                        <label className="block">
                          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Nome da opção *</span>
                          <input
                            value={option.label}
                            onChange={(event) => updateOption(sectionIndex, optionIndex, { label: event.target.value })}
                            maxLength={50}
                            placeholder={`Opção ${optionIndex + 1}`}
                            className="mt-1 min-w-0 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                          />
                        </label>
                        <ImageUploadField
                          compact
                          cropSquare
                          label="Imagem da opção (opcional)"
                          value={option.imageUrl ?? ''}
                          onChange={(imageUrl) => updateOption(sectionIndex, optionIndex, { imageUrl })}
                        />
                        <button
                          type="button"
                          onClick={() => updateSection(sectionIndex, { options: (section.options ?? []).filter((_, index) => index !== optionIndex) })}
                          aria-label={`Excluir opção ${optionIndex + 1}`}
                          className="justify-self-end rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 sm:mb-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );})}
        </div>
      )}
    </section>
  );
}
