import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { badRequest, requireAdmin, serverError } from '@/lib/api';

// GET /api/admin/products/price-history?product_id=xxx
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('product_id');

  if (!productId) return badRequest('product_id e obrigatorio');

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('product_price_history')
    .select('*, changed_by_user:users!product_price_history_changed_by_fkey(name, email)')
    .eq('product_id', productId)
    .order('changed_at', { ascending: false });

  if (error) {
    // Fallback without join if fkey naming differs
    const { data: fallbackData, error: fallbackError } = await admin
      .from('product_price_history')
      .select('*')
      .eq('product_id', productId)
      .order('changed_at', { ascending: false });

    if (fallbackError) return serverError('Erro ao buscar historico de precos');
    return NextResponse.json({ history: fallbackData ?? [] });
  }

  return NextResponse.json({ history: data ?? [] });
}
