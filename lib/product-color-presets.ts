import { PRODUCT_COLOR_PALETTE } from '@/lib/product-colors';

export type ProductColorPresetItem = {
  id: string;
  name: string;
  hex: string;
  sort_order: number;
};

export type ProductColorPreset = {
  id: string;
  name: string;
  sort_order: number;
  items: ProductColorPresetItem[];
};

export const FALLBACK_PRODUCT_COLOR_PRESET: ProductColorPreset = {
  id: 'fallback-standard-colors',
  name: 'Cores padrão',
  sort_order: 0,
  items: PRODUCT_COLOR_PALETTE
    .filter((color) => color.hex !== 'transparent')
    .map((color, index) => ({
      id: `fallback-${color.hex}`,
      name: color.name,
      hex: color.hex,
      sort_order: index * 10,
    })),
};

export function normalizePresetItems(items: ProductColorPresetItem[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'pt-BR'));
}
