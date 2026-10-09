import { NextResponse } from 'next/server';
import { badRequest, notFound, requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { normalizeProductCustomizationSections } from '@/lib/product-customization';

type LinkInput = { step_id?: unknown; sort_order?: unknown; required?: unknown; active?: unknown; blocked_ids?: unknown };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const { data, error } = await getSupabaseAdmin().from('product_customization_steps')
    .select('product_id,step_id,sort_order,required,active,blocked_ids').eq('product_id', id).order('sort_order');
  if (error) return serverError('Erro ao carregar etapas do produto');
  return NextResponse.json({ links: data ?? [] });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const { id } = await context.params;
  let body: LinkInput;
  try { body = await request.json(); } catch { return badRequest('JSON inválido'); }
  const stepId = typeof body.step_id === 'string' ? body.step_id : '';
  if (!/^[0-9a-f-]{36}$/i.test(stepId)) return badRequest('Etapa inválida');
  if (body.required !== undefined && typeof body.required !== 'boolean') return badRequest('Obrigatoriedade inválida');
  if (body.active !== undefined && typeof body.active !== 'boolean') return badRequest('Status inválido');
  const sortOrder = Number(body.sort_order ?? 100);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 1000) return badRequest('Ordem inválida');
  if (!Array.isArray(body.blocked_ids) || body.blocked_ids.some((value) => typeof value !== 'string')) return badRequest('Bloqueios inválidos');
  const admin = getSupabaseAdmin();
  const [product, step, existing] = await Promise.all([
    admin.from('products').select('id,customization_sections').eq('id', id).maybeSingle(),
    admin.from('customization_steps').select('id,definition').eq('id', stepId).maybeSingle(),
    admin.from('product_customization_steps').select('step_id').eq('product_id', id),
  ]);
  if (product.error || step.error || existing.error) return serverError('Erro ao validar vínculo');
  if (!product.data || !step.data) return notFound('Produto ou etapa não encontrado');
  const definition = normalizeProductCustomizationSections([step.data.definition])[0];
  const validIds = new Set([...definition.colors, ...definition.options].map((item) => item.id));
  const blocked = [...new Set(body.blocked_ids as string[])].filter((value) => validIds.has(value));
  if (!(existing.data ?? []).some((link) => link.step_id === stepId)
    && (existing.data?.length ?? 0) + (Array.isArray(product.data.customization_sections) ? product.data.customization_sections.length : 0) >= 10) {
    return badRequest('O produto pode ter no máximo 10 etapas');
  }
  const { data, error } = await admin.from('product_customization_steps').upsert({
    product_id: id, step_id: stepId, sort_order: sortOrder,
    required: body.required !== false, active: body.active !== false, blocked_ids: blocked,
  }).select('product_id,step_id,sort_order,required,active,blocked_ids').single();
  if (error || !data) return serverError('Erro ao vincular etapa ao produto');
  return NextResponse.json({ link: data });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const { id } = await context.params;
  let body: { step_id?: unknown };
  try { body = await request.json(); } catch { return badRequest('JSON inválido'); }
  if (typeof body.step_id !== 'string') return badRequest('Etapa inválida');
  const { error } = await getSupabaseAdmin().from('product_customization_steps')
    .delete().eq('product_id', id).eq('step_id', body.step_id);
  if (error) return serverError('Erro ao remover vínculo');
  return new NextResponse(null, { status: 204 });
}
