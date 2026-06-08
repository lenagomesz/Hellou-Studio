import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser, serverError } from '@/lib/api';

export async function POST() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();

  const { error } = await admin
    .from('notifications')
    .update({ read: true })
    .eq('user_id', auth.user.id)
    .eq('read', false);

  if (error) return serverError('Erro ao marcar notificações');

  return NextResponse.json({ success: true });
}
