import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser, serverError } from '@/lib/api';

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from('notifications')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return serverError('Erro ao buscar notificações');

  const { count } = await admin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .eq('read', false);

  return NextResponse.json({ notifications: data ?? [], unread_count: count ?? 0 });
}
