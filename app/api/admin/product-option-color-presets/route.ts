import { NextResponse } from 'next/server';
import { badRequest, requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { ProductColorPreset, ProductColorPresetItem } from '@/lib/product-color-presets';

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

function mapPreset(row: { id: string; name: string; sort_order: number; items?: ProductColorPresetItem[] }): ProductColorPreset {
  return {
    id: row.id,
    name: row.name,
    sort_order: row.sort_order,
    items: [...(row.items ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'pt-BR')),
  };
}

export async function GET() {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from('product_option_color_presets')
    .select('id, name, sort_order, product_option_color_preset_items(id, name, hex, sort_order)')
    .order('sort_order')
    .order('name');
  if (error) return serverError('Erro ao buscar os grupos de cores');

  const presets = (data ?? []).map((preset) => mapPreset({
    ...preset,
    items: preset.product_option_color_preset_items as ProductColorPresetItem[] | undefined,
  }));
  return NextResponse.json({ presets });
}

export async function POST(request: Request) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;

  let body: { name?: unknown; items?: unknown };
  try { body = await request.json(); } catch { return badRequest('JSON inválido'); }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const items = normalizeItems(body.items);
  if (!name || name.length > 60) return badRequest('Informe um nome de até 60 caracteres para o tipo de variação');
  if (!items) return badRequest('Cadastre entre 1 e 40 cores válidas, sem repetir nome ou cor');

  const admin = getSupabaseAdmin();
  const { data: last } = await admin.from('product_option_color_presets').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const { data: preset, error } = await admin
    .from('product_option_color_presets')
    .insert({ name, sort_order: (last?.sort_order ?? -10) + 10 })
    .select('id, name, sort_order')
    .single();
  if (error?.code === '23505') return badRequest('Já existe um tipo de variação com esse nome');
  if (error || !preset) return serverError('Erro ao criar o tipo de variação');

  const { data: createdItems, error: itemError } = await admin
    .from('product_option_color_preset_items')
    .insert(items.map((item) => ({ ...item, preset_id: preset.id })))
    .select('id, name, hex, sort_order');
  if (itemError) {
    await admin.from('product_option_color_presets').delete().eq('id', preset.id);
    return serverError('Erro ao salvar as cores');
  }
  return NextResponse.json({ preset: mapPreset({ ...preset, items: createdItems as ProductColorPresetItem[] }) }, { status: 201 });
}
