import 'server-only';
import { cache } from 'react';
import { getSupabaseAdmin, isSupabaseAdminConfigured, withTimeout } from '@/lib/supabase';
import type { KitProduct } from '@/lib/product-kits';

// Only public catalog fields are passed to kit builders and recommendations.
export const getKitCatalog = cache(async (): Promise<KitProduct[]> => {
  if (!isSupabaseAdminConfigured()) return [];
  try {
    const { data, error } = await withTimeout(getSupabaseAdmin().from('products')
      .select('id,name,slug,description,category,type,base_price,sale_price,image_url,image_url_2,images,active,fulfillment_mode,is_wholesale,is_customizable,customization_question,customization_help_text,customization_placeholder,customization_sections,image_alt_texts,product_options(id,product_id,name,price_modifier,stock,color,color_name,image_url,sort_order,active)')
      .eq('active', true).eq('type', 'physical').neq('category', 'encomenda')
      .not('name', 'ilike', 'Encomenda%').order('name'));
    if (error) throw error;
    return (data ?? []).map(product => ({
      ...product,
      product_options: (product.product_options ?? []).filter(option => option.active).sort((a, b) => a.sort_order - b.sort_order),
    })) as KitProduct[];
  } catch {
    console.error('[kit-catalog] Catálogo indisponível para kits e sugestões.');
    return [];
  }
});
