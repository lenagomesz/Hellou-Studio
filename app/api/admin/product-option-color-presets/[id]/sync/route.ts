import { NextResponse } from 'next/server';
import { notFound, requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

// Sync only shared presentation data. Product-specific stock, prices, images,
// notes and IDs remain untouched.
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const admin = getSupabaseAdmin();
  const { data: preset, error: presetError } = await admin
    .from('product_option_color_presets')
    .select('customer_label, product_option_color_preset_items(id, name, hex, catalog_color_id)')
    .eq('id', id)
    .maybeSingle();
  if (presetError) return serverError('Erro ao carregar o tipo de variação');
  if (!preset) return notFound('Tipo de variação não encontrado');

  const catalogIds = (preset.product_option_color_preset_items ?? [])
    .map((item) => item.catalog_color_id).filter((value): value is string => Boolean(value));
  const { data: catalogColors, error: colorError } = catalogIds.length
    ? await admin.from('catalog_colors').select('id,name,hex').in('id', catalogIds)
    : { data: [], error: null };
  if (colorError) return serverError('Erro ao carregar as cores globais');
  const byId = new Map((catalogColors ?? []).map((color) => [color.id, color]));

  let updated = 0;
  for (const item of preset.product_option_color_preset_items ?? []) {
    const color = item.catalog_color_id ? byId.get(item.catalog_color_id) : null;
    const { data, error } = await admin
      .from('product_options')
      .update({ color: color?.hex ?? item.hex, color_name: color?.name ?? item.name, variation_label: preset.customer_label })
      .eq('color_preset_item_id', item.id)
      .select('id');
    if (error) return serverError('Não foi possível sincronizar as variações vinculadas');
    updated += data?.length ?? 0;
  }
  return NextResponse.json({ updated });
}
