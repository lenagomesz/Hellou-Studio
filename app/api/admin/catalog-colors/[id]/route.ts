import { NextResponse } from 'next/server';
import { badRequest, notFound, requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const { id } = await context.params;
  let body: { name?: unknown; hex?: unknown; active?: unknown };
  try { body = await request.json(); } catch { return badRequest('JSON inválido'); }
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 60) return badRequest('Nome inválido');
    update.name = body.name.trim();
  }
  if (body.hex !== undefined) {
    if (typeof body.hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(body.hex.trim())) return badRequest('Hexadecimal inválido');
    update.hex = body.hex.trim().toUpperCase();
  }
  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') return badRequest('Status inválido');
    update.active = body.active;
  }
  if (!Object.keys(update).length) return badRequest('Nenhum campo informado');
  const { data, error } = await getSupabaseAdmin().from('catalog_colors')
    .update(update).eq('id', id).select('id,name,hex,active,created_at').maybeSingle();
  if (error?.code === '23505') return badRequest('Outra cor já utiliza este hexadecimal');
  if (error) return serverError('Erro ao atualizar cor');
  if (!data) return notFound('Cor não encontrada');
  return NextResponse.json({ color: data });
}
