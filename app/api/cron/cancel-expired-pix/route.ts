import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendOrderStatusEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

const HOURS_TO_EXPIRE = 24;

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - HOURS_TO_EXPIRE * 60 * 60 * 1000).toISOString();

  const { data: expiredOrders, error: fetchError } = await admin
    .from('orders')
    .select('id, user_id, shipping_address')
    .eq('status', 'awaiting_payment')
    .eq('mp_payment_method', 'pix')
    .lt('created_at', cutoff);

  if (fetchError) {
    console.error('[cancel-expired-pix] fetch error:', fetchError);
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 });
  }

  if (!expiredOrders || expiredOrders.length === 0) {
    return NextResponse.json({ canceled: 0 });
  }

  const ids = expiredOrders.map((o) => o.id);

  const { error: updateError } = await admin
    .from('orders')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
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
      `Pedido #${shortId} — Cancelado`,
      'O prazo de pagamento PIX expirou (24h). Caso deseje, faça um novo pedido.',
      { order_id: order.id, status: 'canceled', event: 'pix_expired' },
    ).catch(() => {});

    const { data: user } = await admin
      .from('users')
      .select('email, name')
      .eq('id', order.user_id)
      .single();

    if (user?.email) {
      sendOrderStatusEmail({
        email: user.email,
        nome: user.name ?? null,
        orderId: order.id,
        newStatus: 'canceled',
      }).catch(() => {});
    }
  }

  console.log(`[cancel-expired-pix] canceled ${ids.length} orders`);
  return NextResponse.json({ canceled: ids.length });
}
