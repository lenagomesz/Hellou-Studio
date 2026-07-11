import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin, badRequest } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const orderId = req.nextUrl.searchParams.get('orderId');
  if (!orderId) return badRequest('orderId obrigatorio');

  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from('order_timeline')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar timeline' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
