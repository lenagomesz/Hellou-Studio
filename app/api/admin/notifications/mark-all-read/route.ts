import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('admin_notifications')
    .update({ read: true })
    .eq('read', false)
    .eq('archived', false);

  if (error) {
    return NextResponse.json(
      { error: 'Erro ao marcar notificações como lidas' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
