'use client';

import { ArrowDown, ArrowUp, Palette, Plus, Trash2, Type } from 'lucide-react';
import type {
  ProductCustomizationColor,
  ProductCustomizationSection,
  ProductCustomizationSectionType,
} from '@/lib/product-customization';
import { PRODUCT_COLOR_PALETTE } from '@/lib/product-colors';

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

function createSection(): ProductCustomizationSection {
  return {
    id: createId('section'),
    label: '',
    type: 'color',
    required: true,
    helpText: '',
    placeholder: '',
    colors: createPresetColors(),
  };
}

function usesColor(type: ProductCustomizationSectionType) {
  return type === 'color' || type === 'color_text';
}

function usesText(type: ProductCustomizationSectionType) {
  return type === 'text' || type === 'color_text';
}

export function CustomizationSectionsEditor({
  value,
  onChange,
}: {
  value: ProductCustomizationSection[];
  onChange: (sections: ProductCustomizationSection[]) => void;
}) {
  function updateSection(index: number, patch: Partial<ProductCustomizationSection>) {
    onChange(value.map((section, currentIndex) => (
      currentIndex === index ? { ...section, ...patch } : section
    )));
  }

  function moveSection(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= value.length) return;
    const next = [...value];
    [next[index], next[destination]] = [next[destination], next[index]];
    onChange(next);
  }

  function updateColor(sectionIndex: number, colorIndex: number, patch: Partial<ProductCustomizationColor>) {
    const section = value[sectionIndex];
    updateSection(sectionIndex, {
      colors: section.colors.map((color, currentIndex) => (
        currentIndex === colorIndex ? { ...color, ...patch } : color
      )),
    });
  }

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/50 dark:bg-violet-950/15 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">Escolhas combináveis</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Seções de variação personalizada</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
            Crie escolhas independentes, como cor da base, cor das teclas e nome. Cada seção pode pedir cor, texto ou os dois.
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
          {value.map((section, sectionIndex) => (
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
                  <button type="button" onClick={() => onChange(value.filter((_, index) => index !== sectionIndex))} aria-label="Excluir seção" className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
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
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="color">Somente cor</option>
                    <option value="text">Somente texto</option>
                    <option value="color_text">Cor + texto</option>
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
                <label className="mt-4 block">
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
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
