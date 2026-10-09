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

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('products.manage');
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const withoutReplacement = new URL(request.url).searchParams.get('withoutReplacement') === '1';
  const { error } = withoutReplacement
    ? await getSupabaseAdmin().rpc('delete_catalog_color_everywhere', { p_color_id: id })
    : await getSupabaseAdmin().rpc('delete_unused_catalog_color', { p_color_id: id });
  if (error?.code === 'PGRST202' || error?.code === '42883') {
    return NextResponse.json({
      error: 'A função de exclusão ainda não está instalada no banco. Aplique as migrações 20261010_catalog_color_merge.sql e 20261011_catalog_color_removal.sql no Supabase SQL Editor, nesta ordem.',
    }, { status: 503 });
  }
  if (error?.message?.includes('Cor não encontrada')) return notFound('Cor não encontrada');
  if (error?.message?.includes('ainda é usada')) return NextResponse.json({ error: error.message }, { status: 409 });
  if (error?.code === '23503') return NextResponse.json({ error: 'Esta cor ainda tem vínculos no banco. Use a exclusão sem substituição ou substitua por outra cor.' }, { status: 409 });
  if (error) {
    console.error('[catalog-colors] delete failed:', { code: error.code, message: error.message });
    return serverError('Não foi possível excluir a cor. Confira os vínculos e tente novamente.');
  }
  return new NextResponse(null, { status: 204 });
}
