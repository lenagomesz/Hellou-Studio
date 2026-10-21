import type { ProductCustomizationSection, ProductCustomizationSelection } from './product-customization';
import { normalizeProductColor } from './product-colors';

/** Read actual available choices, rather than trusting color data restored from a URL. */
export function getProduct3DSelection(
  defaultModel: string | null | undefined,
  sections: ProductCustomizationSection[],
  selections: Record<string, ProductCustomizationSelection>,
  commercialColor?: string | null,
) {
  let modelUrl = defaultModel || null;
  let color = normalizeProductColor(commercialColor);
  for (const section of sections) {
    const selection = selections[section.id];
    if (!selection) continue;
    const option = section.options.find((item) => item.id === selection.optionId && item.active !== false);
    // A missing model must not show a different variant's geometry.
    if (option && section.options.some((item) => item.model3dUrl)) modelUrl = option.model3dUrl || null;
    const choice = section.colors.find((item) => item.id === selection.colorId);
    if (choice) color = normalizeProductColor(choice.value);
  }
  return { modelUrl, color };
}
