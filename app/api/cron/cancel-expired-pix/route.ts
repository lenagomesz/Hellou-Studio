import { NextResponse } from 'next/server';
import { getPaymentClient } from '@/lib/mercadopago';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendOrderStatusEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';
import { captureOperationalError, finishCronRun, startCronRun, structuredLog } from '@/lib/observability';

const PIX_EXPIRATION_MINUTES = 30;

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const cronRun = await startCronRun('cancel-expired-pix');

  const admin = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - PIX_EXPIRATION_MINUTES * 60 * 1000).toISOString();
  const { data: candidates, error: fetchError } = await admin
    .from('orders')
    .select('id, user_id, mp_payment_id')
    .eq('status', 'awaiting_payment')
    .eq('mp_payment_method', 'pix')
    .lt('created_at', cutoff);

  if (fetchError) {
    await finishCronRun(cronRun, { status: 'failed', error: fetchError });
    await captureOperationalError({ fingerprint: 'cron-cancel-pix-fetch', category: 'cron.failed', title: 'Falha ao verificar PIX expirados', error: fetchError, route: '/api/cron/cancel-expired-pix', alert: true });
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
      await captureOperationalError({ fingerprint: 'cron-cancel-pix-provider-check', category: 'payment.provider_check_failed', title: 'Falha ao consultar pagamento PIX', error, orderId: order.id, severity: 'warning', alert: true });
    }
  }

  if (expiredOrders.length === 0) {
    await finishCronRun(cronRun, { status: 'success', processedCount: 0 });
    return NextResponse.json({ canceled: 0 });
  }

  const ids = expiredOrders.map((order) => order.id);
  const { error: updateError } = await admin
    .from('orders')
    .update({ status: 'canceled', mp_status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('status', 'awaiting_payment')
    .in('id', ids);

  if (updateError) {
    await finishCronRun(cronRun, { status: 'failed', error: updateError });
    await captureOperationalError({ fingerprint: 'cron-cancel-pix-update', category: 'cron.failed', title: 'Falha ao cancelar pedidos com PIX expirado', error: updateError, route: '/api/cron/cancel-expired-pix', alert: true });
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

  await finishCronRun(cronRun, { status: 'success', processedCount: ids.length });
  structuredLog('info', 'cron.cancel_expired_pix.completed', { processedCount: ids.length });
  return NextResponse.json({ canceled: ids.length });
}

export const GET = POST;
