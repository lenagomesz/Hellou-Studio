import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser, serverError } from '@/lib/api';

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('orders')
    .select('*, items:order_items(*, product:products(id, name, image_url))')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) return serverError('Erro ao buscar pedidos');

  return NextResponse.json(data ?? []);
}
