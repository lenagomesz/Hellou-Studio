import { NextResponse } from 'next/server';
import { badRequest, notFound, requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { ProductColorPresetItem } from '@/lib/product-color-presets';
import { ensureCatalogColor } from '@/lib/catalog-admin';

type ColorInput = { id?: unknown; name?: unknown; hex?: unknown; active?: unknown };

function normalizeHex(value: unknown) {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value.trim())) return null;
  return value.trim().toUpperCase();
}

function normalizeItems(value: unknown): Array<{ id?: string; name: string; hex: string; active: boolean; sort_order: number }> | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) return null;
  const names = new Set<string>();
  const hexes = new Set<string>();
  const itemIds = new Set<string>();
  const items: Array<{ id?: string; name: string; hex: string; active: boolean; sort_order: number }> = [];
  for (const [index, input] of value.entries()) {
    const item = input as ColorInput;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const hex = normalizeHex(item.hex);
    const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : undefined;
    if (!name || name.length > 60 || !hex || (item.active !== undefined && typeof item.active !== 'boolean') || (id && itemIds.has(id)) || names.has(name.toLocaleLowerCase('pt-BR')) || hexes.has(hex)) return null;
    if (id) itemIds.add(id);
    names.add(name.toLocaleLowerCase('pt-BR'));
    hexes.add(hex);
    items.push({ id, name, hex, active: item.active !== false, sort_order: index * 10 });
  }
  return items;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const { id } = await context.params;
  let body: { name?: unknown; customer_label?: unknown; items?: unknown };
  try { body = await request.json(); } catch { return badRequest('JSON inválido'); }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const customerLabel = typeof body.customer_label === 'string' ? body.customer_label.trim() : 'Escolha uma cor';
  const items = normalizeItems(body.items);
  if (!name || name.length > 60) return badRequest('Informe um nome de até 60 caracteres para o tipo de variação');
  if (!customerLabel || customerLabel.length > 60) return badRequest('Informe um título de até 60 caracteres para o cliente');
  if (!items) return badRequest('Cadastre entre 1 e 40 cores válidas, sem repetir nome ou cor');

  const admin = getSupabaseAdmin();
  const { data: preset, error } = await admin.from('product_option_color_presets').update({ name, customer_label: customerLabel }).eq('id', id).select('id, name, customer_label, sort_order').maybeSingle();
  if (error?.code === '23505') return badRequest('Já existe um tipo de variação com esse nome');
  if (error) return serverError('Erro ao atualizar o tipo de variação');
  if (!preset) return notFound('Tipo de variação não encontrado');
  const { data: currentItems, error: currentItemsError } = await admin
    .from('product_option_color_preset_items')
    .select('id, active')
    .eq('preset_id', id);
  if (currentItemsError) return serverError('Erro ao carregar as cores atuais');
  const knownIds = new Set((currentItems ?? []).map((item) => item.id));
  if (items.some((item) => item.id && !knownIds.has(item.id))) return badRequest('Uma das cores não pertence a este tipo de variação');

  const savedItems: ProductColorPresetItem[] = [];
  for (const item of items) {
    const catalogColorId = await ensureCatalogColor(admin, item.name, item.hex);
    if (item.id) {
      const { data: updated, error: updateError } = await admin
        .from('product_option_color_preset_items')
        .update({ name: item.name, hex: item.hex, active: item.active, sort_order: item.sort_order, catalog_color_id: catalogColorId })
        .eq('id', item.id)
        .select('id, name, hex, active, sort_order')
        .single();
      if (updateError || !updated) return serverError('Erro ao salvar as cores');
      const { error: linkedError } = await admin.from('product_options')
        .update({ catalog_color_id: catalogColorId }).eq('color_preset_item_id', item.id);
      if (linkedError) return serverError('Erro ao atualizar o vínculo das variações com a cor');
      savedItems.push(updated as ProductColorPresetItem);
    } else {
      const { data: inserted, error: insertError } = await admin
        .from('product_option_color_preset_items')
        .insert({ preset_id: id, name: item.name, hex: item.hex, active: item.active, sort_order: item.sort_order, catalog_color_id: catalogColorId })
        .select('id, name, hex, active, sort_order')
        .single();
      if (insertError || !inserted) return serverError('Erro ao salvar as cores');
      savedItems.push(inserted as ProductColorPresetItem);
    }
  }
  return NextResponse.json({ preset: { ...preset, items: savedItems } });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const { error, count } = await getSupabaseAdmin().from('product_option_color_presets').delete({ count: 'exact' }).eq('id', id);
  if (error) return serverError('Erro ao excluir o tipo de variação');
  if (!count) return notFound('Tipo de variação não encontrado');
  return new NextResponse(null, { status: 204 });
}
