import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser, badRequest, notFound, serverError } from '@/lib/api';
import { sendOrderStatusEmail } from '@/lib/email';

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();

  const { data: order, error } = await admin
    .from('orders')
    .select('id, status, user_id')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .single();

  if (error || !order) return notFound('Pedido não encontrado');

  if (order.status !== 'shipped') {
    return badRequest('Só é possível confirmar recebimento de pedidos enviados');
  }

  const { error: updateError } = await admin
    .from('orders')
    .update({ status: 'delivered', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (updateError) return serverError('Erro ao confirmar recebimento');

  sendOrderStatusEmail({
    email: auth.user.email,
    nome: auth.user.name ?? null,
    orderId: id,
    newStatus: 'delivered',
    trackingCode: null,
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
