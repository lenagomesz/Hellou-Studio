import { NextResponse } from 'next/server';
import { badRequest, notFound, requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { ProductColorPresetItem } from '@/lib/product-color-presets';

type ColorInput = { name?: unknown; hex?: unknown };

function normalizeHex(value: unknown) {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value.trim())) return null;
  return value.trim().toUpperCase();
}

function normalizeItems(value: unknown): Array<{ name: string; hex: string; sort_order: number }> | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) return null;
  const names = new Set<string>();
  const hexes = new Set<string>();
  const items: Array<{ name: string; hex: string; sort_order: number }> = [];
  for (const [index, input] of value.entries()) {
    const item = input as ColorInput;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const hex = normalizeHex(item.hex);
    if (!name || name.length > 60 || !hex || names.has(name.toLocaleLowerCase('pt-BR')) || hexes.has(hex)) return null;
    names.add(name.toLocaleLowerCase('pt-BR'));
    hexes.add(hex);
    items.push({ name, hex, sort_order: index * 10 });
  }
  return items;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const { id } = await context.params;
  let body: { name?: unknown; items?: unknown };
  try { body = await request.json(); } catch { return badRequest('JSON inválido'); }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const items = normalizeItems(body.items);
  if (!name || name.length > 60) return badRequest('Informe um nome de até 60 caracteres para o tipo de variação');
  if (!items) return badRequest('Cadastre entre 1 e 40 cores válidas, sem repetir nome ou cor');

  const admin = getSupabaseAdmin();
  const { data: preset, error } = await admin.from('product_option_color_presets').update({ name }).eq('id', id).select('id, name, sort_order').maybeSingle();
  if (error?.code === '23505') return badRequest('Já existe um tipo de variação com esse nome');
  if (error) return serverError('Erro ao atualizar o tipo de variação');
  if (!preset) return notFound('Tipo de variação não encontrado');
  const { error: deleteError } = await admin.from('product_option_color_preset_items').delete().eq('preset_id', id);
  if (deleteError) return serverError('Erro ao atualizar as cores');
  const { data: savedItems, error: itemError } = await admin.from('product_option_color_preset_items').insert(items.map((item) => ({ ...item, preset_id: id }))).select('id, name, hex, sort_order');
  if (itemError) return serverError('Erro ao salvar as cores');
  return NextResponse.json({ preset: { ...preset, items: savedItems as ProductColorPresetItem[] } });
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
