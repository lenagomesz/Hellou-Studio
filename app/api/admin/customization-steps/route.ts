import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { badRequest, requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { normalizeProductCustomizationSections } from '@/lib/product-customization';
import { linkSectionColors } from '@/lib/catalog-admin';

export async function GET() {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const admin = getSupabaseAdmin();
  const [steps, links, products] = await Promise.all([
    admin.from('customization_steps').select('id,name,description,definition,active,created_at,updated_at').order('created_at'),
    admin.from('product_customization_steps').select('product_id,step_id,sort_order,required,active,blocked_ids'),
    admin.from('products').select('id,name'),
  ]);
  if (steps.error || links.error || products.error) return serverError('Erro ao carregar as etapas');
  const productNames = new Map((products.data ?? []).map((product) => [product.id, product.name]));
  return NextResponse.json({ steps: (steps.data ?? []).map((step) => ({ ...step,
    recent: Date.now() - new Date(step.created_at).getTime() < 7 * 86400000,
    products: (links.data ?? []).filter((link) => link.step_id === step.id).map((link) => ({
      ...link, name: productNames.get(link.product_id) ?? 'Produto removido',
    })),
  })) });
}

export async function POST(request: Request) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  let body: { name?: unknown; description?: unknown; definition?: unknown };
  try { body = await request.json(); } catch { return badRequest('JSON inválido'); }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!name || name.length > 80 || !description || description.length > 300) return badRequest('Informe nome e descrição válidos');
  const id = randomUUID();
  let definition;
  try {
    definition = normalizeProductCustomizationSections([{ ...(body.definition as object), id: `step-${id}` }])[0];
    if (definition.showWhen) return badRequest('Condições de outra etapa devem ser configuradas no produto');
    definition = await linkSectionColors(getSupabaseAdmin(), definition);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Etapa inválida');
  }
  const { data, error } = await getSupabaseAdmin().from('customization_steps')
    .insert({ id, name, description, definition }).select('*').single();
  if (error || !data) return serverError('Erro ao cadastrar etapa');
  return NextResponse.json({ step: data }, { status: 201 });
}
