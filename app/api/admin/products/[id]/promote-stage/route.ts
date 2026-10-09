import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { badRequest, requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const { id } = await context.params;
  let body: { sectionId?: unknown; name?: unknown; description?: unknown };
  try { body = await request.json(); } catch { return badRequest('JSON inválido'); }
  const sectionId = typeof body.sectionId === 'string' ? body.sectionId.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!/^[0-9a-f-]{36}$/i.test(id) || !sectionId || sectionId.length > 80
    || !name || name.length > 80 || !description || description.length > 300) {
    return badRequest('Informe uma etapa salva, nome e descrição válidos');
  }
  const { data, error } = await getSupabaseAdmin().rpc('promote_product_stage', {
    p_product_id: id, p_section_id: sectionId, p_name: name, p_description: description,
  });
  if (error?.code === 'P0001') return badRequest(error.message);
  if (error || !data) {
    console.error('[promote-stage] failed:', error);
    return serverError('Não foi possível padronizar a etapa. Confira se a nova migração foi aplicada.');
  }
  revalidatePath(`/products/${id}`, 'page');
  revalidatePath(`/dashboard/products/${id}/edit`, 'page');
  return NextResponse.json(data);
}
