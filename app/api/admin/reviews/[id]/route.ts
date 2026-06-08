import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin, notFound, serverError } from '@/lib/api';

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();

  const { data } = await admin.from('reviews').select('id').eq('id', id).maybeSingle();
  if (!data) return notFound('Avaliação não encontrada');

  const { error } = await admin.from('reviews').delete().eq('id', id);
  if (error) return serverError('Erro ao excluir avaliação');

  return NextResponse.json({ success: true });
}
