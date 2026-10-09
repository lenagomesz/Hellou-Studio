import { NextResponse } from 'next/server';
import { badRequest, requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

async function allRows<T>(loadPage: (from: number, to: number) => PromiseLike<{
  data: T[] | null; error: { message: string } | null;
}>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await loadPage(from, from + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 500) return rows;
  }
}

export async function GET() {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const admin = getSupabaseAdmin();
  try {
    const [colors, options, presets, groups, products, steps, links] = await Promise.all([
      allRows((from, to) => admin.from('catalog_colors').select('id,name,hex,active,created_at').order('id').range(from, to)),
      allRows((from, to) => admin.from('product_options').select('id,product_id,catalog_color_id,color_preset_item_id,color,color_name').order('id').range(from, to)),
      allRows((from, to) => admin.from('product_option_color_preset_items').select('id,catalog_color_id,preset_id,hex').order('id').range(from, to)),
      allRows((from, to) => admin.from('product_option_color_presets').select('id,name').order('id').range(from, to)),
      allRows((from, to) => admin.from('products').select('id,name,customization_sections').order('id').range(from, to)),
      allRows((from, to) => admin.from('customization_steps').select('id,name,definition').order('id').range(from, to)),
      allRows((from, to) => admin.from('product_customization_steps').select('product_id,step_id').order('product_id').order('step_id').range(from, to)),
    ]);
    const presetColors = new Map(presets.map((item) => [item.id, item.catalog_color_id]));
    const catalogByHex = new Map(colors.map((color) => [color.hex, color.id]));
    const catalogByName = new Map(colors.map((color) => [color.name.toLocaleLowerCase('pt-BR'), color.id]));
    const usage = new Map(colors.map((color) => [color.id, { products: new Set<string>(), steps: new Set<string>(), presets: new Set<string>() }]));
    for (const item of presets) {
      const colorId = item.catalog_color_id || catalogByHex.get(item.hex.toUpperCase());
      if (colorId && usage.has(colorId)) usage.get(colorId)!.presets.add(item.preset_id);
    }
    const localSteps: Array<{ id: string; name: string }> = [];
    for (const option of options) {
      const id = option.catalog_color_id || (option.color_preset_item_id && presetColors.get(option.color_preset_item_id))
        || (option.color && (catalogByHex.get(option.color.toUpperCase()) || catalogByName.get(option.color.toLocaleLowerCase('pt-BR'))))
        || (option.color_name && catalogByName.get(option.color_name.toLocaleLowerCase('pt-BR')));
      if (id) usage.get(id)?.products.add(option.product_id);
    }
    for (const product of products) {
      for (const section of Array.isArray(product.customization_sections) ? product.customization_sections : []) {
        const localStepId = `local:${product.id}:${String(section.id ?? '')}`;
        localSteps.push({ id: localStepId, name: `${String(section.label ?? 'Etapa exclusiva')} · ${product.name}` });
        for (const color of Array.isArray(section.colors) ? section.colors : []) {
          const colorId = typeof color.colorId === 'string' ? color.colorId
            : catalogByHex.get(String(color.value ?? '').toUpperCase()) || catalogByName.get(String(color.label ?? '').toLocaleLowerCase('pt-BR'));
          if (colorId) {
            usage.get(colorId)?.products.add(product.id);
            usage.get(colorId)?.steps.add(localStepId);
          }
        }
      }
    }
    for (const step of steps) {
      const definition = step.definition as { colors?: Array<{ colorId?: string; value?: string }> };
      for (const color of definition.colors ?? []) {
        const colorId = color.colorId || catalogByHex.get(String(color.value ?? '').toUpperCase());
        if (!colorId) continue;
        usage.get(colorId)?.steps.add(step.id);
        for (const link of links) if (link.step_id === step.id) usage.get(colorId)?.products.add(link.product_id);
      }
    }
    return NextResponse.json({ colors: colors.map((color) => ({
      ...color,
      recent: Date.now() - new Date(color.created_at).getTime() < 7 * 86400000,
      productCount: usage.get(color.id)?.products.size ?? 0,
      stepCount: usage.get(color.id)?.steps.size ?? 0,
      presetCount: usage.get(color.id)?.presets.size ?? 0,
      presets: groups.filter((group) => usage.get(color.id)?.presets.has(group.id)).map((group) => ({ id: group.id, name: group.name })),
      products: products.filter((product) => usage.get(color.id)?.products.has(product.id)).map((product) => ({ id: product.id, name: product.name })),
      steps: [...steps, ...localSteps].filter((step) => usage.get(color.id)?.steps.has(step.id)).map((step) => ({ id: step.id, name: step.name })),
    })) });
  } catch (error) {
    console.error('[catalog-colors] lookup failed:', error);
    return serverError('Erro ao carregar a central de cores');
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  let body: { name?: unknown; hex?: unknown };
  try { body = await request.json(); } catch { return badRequest('JSON inválido'); }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const hex = typeof body.hex === 'string' ? body.hex.trim().toUpperCase() : '';
  if (!name || name.length > 60 || !/^#[0-9A-F]{6}$/.test(hex)) return badRequest('Informe nome e cor hexadecimal válidos');
  const { data, error } = await getSupabaseAdmin().from('catalog_colors')
    .insert({ name, hex }).select('id,name,hex,active,created_at').single();
  if (error?.code === '23505') return badRequest('Esta cor já existe na central');
  if (error || !data) return serverError('Erro ao cadastrar cor');
  return NextResponse.json({ color: data }, { status: 201 });
}
