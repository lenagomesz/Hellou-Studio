import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();
  const { count, error } = await admin
    .from('admin_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('read', false)
    .eq('archived', false);

  if (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar contador' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    unread_count: count || 0,
  });
}
