import { NextResponse } from 'next/server';
import { badRequest, requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const { id } = await context.params;
  let body: { targetId?: unknown };
  try { body = await request.json(); } catch { return badRequest('JSON inválido'); }
  if (typeof body.targetId !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)
    || !/^[0-9a-f-]{36}$/i.test(body.targetId) || body.targetId === id) {
    return badRequest('Escolha outra cor válida para substituir');
  }
  const { data, error } = await getSupabaseAdmin().rpc('merge_catalog_color', {
    p_source_id: id, p_target_id: body.targetId,
  });
  if (error?.message?.includes('não encontrada')) return badRequest(error.message);
  if (error) {
    console.error('[catalog-colors] merge failed:', error);
    return serverError('Erro ao substituir cor. Confirme se a nova migração foi aplicada.');
  }
  return NextResponse.json({ affected: data });
}
