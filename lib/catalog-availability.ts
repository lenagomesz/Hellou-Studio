import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProductOption } from '@/types/database';
import {
  normalizeProductCustomizationSections,
  type ProductCustomizationSection,
} from '@/lib/product-customization';

export type CatalogColor = { id: string; name: string; hex: string; active: boolean; created_at: string };
export type PresetItem = { id: string; active: boolean; catalog_color_id: string | null };
export type StepLink = {
  product_id: string;
  step_id: string;
  sort_order: number;
  required: boolean;
  active: boolean;
  blocked_ids: string[];
  label_override?: string | null;
};
export type Step = { id: string; name: string; description: string; definition: unknown; active: boolean };

export async function loadCatalogColors(admin: SupabaseClient): Promise<CatalogColor[]> {
  const { data, error } = await admin.from('catalog_colors').select('id,name,hex,active,created_at').order('name');
  if (error) throw error;
  return (data ?? []) as CatalogColor[];
}

export async function loadAvailableProductOptions(admin: SupabaseClient, options: ProductOption[], colors?: CatalogColor[]) {
  const catalog = colors ?? await loadCatalogColors(admin);
  const presetIds = [...new Set(options.map((option) => option.color_preset_item_id).filter((id): id is string => Boolean(id)))];
  let presetItems: PresetItem[] = [];
  if (presetIds.length) {
    const { data, error } = await admin.from('product_option_color_preset_items')
      .select('id,active,catalog_color_id').in('id', presetIds);
    if (error) throw error;
    presetItems = (data ?? []) as PresetItem[];
  }
  return filterAvailableProductOptions(options, catalog, presetItems);
}

export function filterAvailableProductOptions(options: ProductOption[], catalog: CatalogColor[], presetItems: PresetItem[]) {
  const byId = new Map(catalog.map((color) => [color.id, color]));
  const byHex = new Map(catalog.map((color) => [color.hex.toUpperCase(), color]));
  const byName = new Map(catalog.map((color) => [color.name.toLocaleLowerCase('pt-BR'), color]));
  const byPresetId = new Map(presetItems.map((item) => [item.id, item]));
  return options.filter((option) => {
    if (!option.active) return false;
    const preset = option.color_preset_item_id ? byPresetId.get(option.color_preset_item_id) : undefined;
    if (option.color_preset_item_id && (!preset || !preset.active)) return false;
    const color = (option.catalog_color_id && byId.get(option.catalog_color_id))
      || (preset?.catalog_color_id && byId.get(preset.catalog_color_id))
      || (option.color && (byHex.get(option.color.toUpperCase()) || byName.get(option.color.toLocaleLowerCase('pt-BR'))))
      || (option.color_name && byName.get(option.color_name.toLocaleLowerCase('pt-BR')));
    return !color || color.active;
  }).map((option) => {
    const preset = option.color_preset_item_id ? byPresetId.get(option.color_preset_item_id) : undefined;
    const color = (option.catalog_color_id && byId.get(option.catalog_color_id))
      || (preset?.catalog_color_id && byId.get(preset.catalog_color_id))
      || (option.color && (byHex.get(option.color.toUpperCase()) || byName.get(option.color.toLocaleLowerCase('pt-BR'))))
      || (option.color_name && byName.get(option.color_name.toLocaleLowerCase('pt-BR')));
    return color ? { ...option, color: color.hex, color_name: color.name } : option;
  });
}

export async function loadEffectiveCustomizationSections(
  admin: SupabaseClient,
  productId: string,
  exclusiveInput: unknown,
  colors?: CatalogColor[],
): Promise<ProductCustomizationSection[]> {
  const catalog = colors ?? await loadCatalogColors(admin);
  const { data: linkRows, error: linkError } = await admin.from('product_customization_steps')
    .select('product_id,step_id,sort_order,required,active,blocked_ids,label_override')
    .eq('product_id', productId).order('sort_order');
  if (linkError) throw linkError;
  const links = (linkRows ?? []) as StepLink[];
  let steps: Step[] = [];
  if (links.length) {
    const { data, error } = await admin.from('customization_steps')
      .select('id,name,description,definition,active').in('id', links.map((link) => link.step_id));
    if (error) throw error;
    steps = (data ?? []) as Step[];
  }
  return resolveEffectiveCustomizationSections(exclusiveInput, catalog, links, steps);
}

export function resolveEffectiveCustomizationSections(exclusiveInput: unknown, catalog: CatalogColor[], links: StepLink[], steps: Step[]): ProductCustomizationSection[] {
  const byId = new Map(catalog.map((color) => [color.id, color]));
  const byHex = new Map(catalog.map((color) => [color.hex.toUpperCase(), color]));
  const byName = new Map(catalog.map((color) => [color.name.toLocaleLowerCase('pt-BR'), color]));
  const exclusive = normalizeProductCustomizationSections(exclusiveInput);
  const byStepId = new Map(steps.map((step) => [step.id, step]));
  const positioned: Array<{ order: number; section: ProductCustomizationSection }> = exclusive.map((section, index) => ({ order: section.sortOrder ?? index * 10, section }));
  for (const link of links) {
    const step = byStepId.get(link.step_id);
    if (!step) continue;
    const definition = normalizeProductCustomizationSections([step.definition])[0];
    positioned.push({
      order: link.sort_order,
      section: { ...definition, label: link.label_override?.trim() || definition.label,
        required: link.required, available: link.active && step.active,
        colors: definition.colors.filter((item) => !link.blocked_ids.includes(item.id)),
        options: definition.options.filter((item) => !link.blocked_ids.includes(item.id)) },
    });
  }
  return positioned.sort((a, b) => a.order - b.order).map(({ section }) => {
    const colors = section.colors.flatMap((item) => {
      const color = (item.colorId && byId.get(item.colorId)) || byHex.get(item.value.toUpperCase())
        || byName.get(item.value.toLocaleLowerCase('pt-BR')) || byName.get(item.label.toLocaleLowerCase('pt-BR'));
      if (color && !color.active) return [];
      return [{ ...item, ...(color ? { colorId: color.id, label: color.name, value: color.hex } : {}) }];
    });
    const options = section.options.filter((item) => item.active !== false);
    return { ...section, colors, options,
      ...((section.type === 'color' || section.type === 'color_text') && colors.length === 0
        || (section.type === 'option' || section.type === 'option_text') && options.length === 0
        ? { availabilityExhausted: true } : {}) };
  });
}

export function validateCustomizationChoices(sections: ProductCustomizationSection[], text: string): boolean {
  if (!sections.length) return !/^(?:[^\n]+): (?:Cor|Opção): /m.test(text);
  const labels = new Map(sections.map((section) => [section.label, section]));
  for (const line of text.split('\n').filter(Boolean)) {
    const separator = line.indexOf(': ');
    if (separator < 0) return false;
    const section = labels.get(line.slice(0, separator));
    if (!section) return false;
    if (section.available === false) return false;
    const value = line.slice(separator + 2);
    const color = /(?:^| · )Cor: ([^·]+)/.exec(value)?.[1]?.trim();
    const option = /(?:^| · )Opção: ([^·]+)/.exec(value)?.[1]?.trim();
    if (color && !section.colors.some((item) => item.label === color)) return false;
    if (option && !section.options.some((item) => item.label === option)) return false;
  }
  return true;
}
