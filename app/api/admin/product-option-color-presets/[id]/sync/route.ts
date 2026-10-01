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
    .select('customer_label, product_option_color_preset_items(id, name, hex)')
    .eq('id', id)
    .maybeSingle();
  if (presetError) return serverError('Erro ao carregar o tipo de variação');
  if (!preset) return notFound('Tipo de variação não encontrado');

  let updated = 0;
  for (const item of preset.product_option_color_preset_items ?? []) {
    const { data, error } = await admin
      .from('product_options')
      .update({ color: item.hex, color_name: item.name, variation_label: preset.customer_label })
      .eq('color_preset_item_id', item.id)
      .select('id');
    if (error) return serverError('Não foi possível sincronizar as variações vinculadas');
    updated += data?.length ?? 0;
  }
  return NextResponse.json({ updated });
}
