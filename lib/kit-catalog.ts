import 'server-only';
import { cache } from 'react';
import { getSupabaseAdmin, isSupabaseAdminConfigured, withTimeout } from '@/lib/supabase';
import type { KitProduct } from '@/lib/product-kits';
import type { ProductOption } from '@/types/database';
import { filterAvailableProductOptions, loadCatalogColors, resolveEffectiveCustomizationSections, type PresetItem, type Step, type StepLink } from '@/lib/catalog-availability';

// Only public catalog fields are passed to kit builders and recommendations.
export const getKitCatalog = cache(async (): Promise<KitProduct[]> => {
  if (!isSupabaseAdminConfigured()) return [];
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await withTimeout(admin.from('products')
      .select('id,name,slug,description,category,type,base_price,sale_price,image_url,image_url_2,images,active,fulfillment_mode,is_wholesale,is_customizable,customization_question,customization_help_text,customization_placeholder,customization_sections,image_alt_texts,product_options(id,product_id,name,price_modifier,stock,color,color_name,color_preset_item_id,catalog_color_id,image_url,sort_order,active)')
      .eq('active', true).eq('type', 'physical').neq('category', 'encomenda')
      .not('name', 'ilike', 'Encomenda%').order('name'));
    if (error) throw error;
    const [colors, presetResult, linksResult, stepsResult] = await Promise.all([
      loadCatalogColors(admin), admin.from('product_option_color_preset_items').select('id,active,catalog_color_id'),
      admin.from('product_customization_steps').select('product_id,step_id,sort_order,required,active,blocked_ids'),
      admin.from('customization_steps').select('id,name,description,definition,active'),
    ]);
    if (presetResult.error || linksResult.error || stepsResult.error) throw presetResult.error ?? linksResult.error ?? stepsResult.error;
    return (data ?? []).map(product => ({
      ...product,
      total_option_count: (product.product_options ?? []).length,
      customization_sections: resolveEffectiveCustomizationSections(
        product.customization_sections, colors,
        (linksResult.data ?? []).filter((link) => link.product_id === product.id) as StepLink[],
        (stepsResult.data ?? []) as Step[],
      ),
      product_options: filterAvailableProductOptions(
        (product.product_options ?? []) as ProductOption[], colors, (presetResult.data ?? []) as PresetItem[],
      ).sort((a, b) => a.sort_order - b.sort_order),
    })) as KitProduct[];
  } catch {
    console.error('[kit-catalog] Catálogo indisponível para kits e sugestões.');
    return [];
  }
});
