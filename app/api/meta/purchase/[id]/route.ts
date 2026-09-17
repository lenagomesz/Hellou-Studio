import { NextResponse } from 'next/server';
import { requireUser, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { confirmedMetaPurchase } from '@/lib/meta-purchase';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const { data: order, error } = await getSupabaseAdmin()
    .from('orders')
    .select('id, status, mp_status, total, items:order_items(product_id, quantity)')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (error) return serverError('Erro ao consultar pedido');
  if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

  return NextResponse.json(confirmedMetaPurchase({ ...order, items: order.items ?? [] }) ?? { confirmed: false }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
