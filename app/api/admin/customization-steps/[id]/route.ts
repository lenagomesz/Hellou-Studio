import { NextResponse } from 'next/server';
import { badRequest, notFound, requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { normalizeProductCustomizationSections } from '@/lib/product-customization';
import { linkSectionColors } from '@/lib/catalog-admin';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const { id } = await context.params;
  let body: { name?: unknown; description?: unknown; definition?: unknown; active?: unknown };
  try { body = await request.json(); } catch { return badRequest('JSON inválido'); }
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80) return badRequest('Nome inválido');
    update.name = body.name.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || !body.description.trim() || body.description.length > 300) return badRequest('Descrição inválida');
    update.description = body.description.trim();
  }
  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') return badRequest('Status inválido');
    update.active = body.active;
  }
  if (body.definition !== undefined) {
    try {
      const definition = normalizeProductCustomizationSections([{ ...(body.definition as object), id: `step-${id}` }])[0];
      if (definition.showWhen) return badRequest('Condições de outra etapa devem ser configuradas no produto');
      update.definition = await linkSectionColors(getSupabaseAdmin(), definition);
    } catch (error) {
      return badRequest(error instanceof Error ? error.message : 'Etapa inválida');
    }
  }
  if (!Object.keys(update).length) return badRequest('Nenhum campo informado');
  update.updated_at = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin().from('customization_steps')
    .update(update).eq('id', id).select('*').maybeSingle();
  if (error) return serverError('Erro ao atualizar etapa');
  if (!data) return notFound('Etapa não encontrada');
  return NextResponse.json({ step: data });
}
