import { NextResponse } from 'next/server';
import { getPaymentClient } from '@/lib/mercadopago';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendOrderStatusEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

const PIX_EXPIRATION_MINUTES = 30;

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - PIX_EXPIRATION_MINUTES * 60 * 1000).toISOString();
  const { data: candidates, error: fetchError } = await admin
    .from('orders')
    .select('id, user_id, mp_payment_id')
    .eq('status', 'awaiting_payment')
    .eq('mp_payment_method', 'pix')
    .lt('created_at', cutoff);

  if (fetchError) {
    console.error('[cancel-expired-pix] fetch error:', fetchError);
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 });
  }

  const paymentClient = getPaymentClient();
  const expiredOrders: Array<{ id: string; user_id: string }> = [];

  for (const order of candidates ?? []) {
    if (!order.mp_payment_id) continue;
    try {
      const payment = await paymentClient.get({ id: order.mp_payment_id });
      if (['approved', 'authorized', 'in_process'].includes(payment.status ?? '')) continue;

      const expirationValue = (payment as unknown as { date_of_expiration?: string }).date_of_expiration;
      const expirationReached = expirationValue ? new Date(expirationValue).getTime() <= Date.now() : true;
      const canceledByProvider = ['cancelled', 'rejected'].includes(payment.status ?? '');
      if (expirationReached || canceledByProvider) expiredOrders.push(order);
    } catch (error) {
      console.error('[cancel-expired-pix] payment check failed:', order.mp_payment_id, error);
    }
  }

  if (expiredOrders.length === 0) return NextResponse.json({ canceled: 0 });

  const ids = expiredOrders.map((order) => order.id);
  const { error: updateError } = await admin
    .from('orders')
    .update({ status: 'canceled', mp_status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('status', 'awaiting_payment')
    .in('id', ids);

  if (updateError) {
    console.error('[cancel-expired-pix] update error:', updateError);
    return NextResponse.json({ error: 'Erro ao cancelar pedidos' }, { status: 500 });
  }

  for (const order of expiredOrders) {
    const shortId = order.id.slice(0, 8).toUpperCase();
    createNotification(
      order.user_id,
      'order_status',
      `Pedido #${shortId} — cancelado`,
      'O prazo de pagamento PIX expirou. Caso deseje, faça um novo pedido.',
      { order_id: order.id, status: 'canceled', event: 'pix_expired' },
    ).catch(() => {});

    const { data: user } = await admin.from('users').select('email, name').eq('id', order.user_id).single();
    if (user?.email) {
      sendOrderStatusEmail({ email: user.email, nome: user.name ?? null, orderId: order.id, newStatus: 'canceled' }).catch(() => {});
    }
  }

  console.log(`[cancel-expired-pix] canceled ${ids.length} orders`);
  return NextResponse.json({ canceled: ids.length });
}
