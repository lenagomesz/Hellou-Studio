import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser, notFound, serverError } from '@/lib/api';

export async function PATCH(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();

  const { error } = await admin
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', auth.user.id);

  if (error) return serverError('Erro ao marcar notificação');

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();

  const { error } = await admin
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user.id);

  if (error) return serverError('Erro ao excluir notificação');

  return NextResponse.json({ success: true });
}
