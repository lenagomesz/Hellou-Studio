import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/api';
import { captureOperationalError, finishCronRun, startCronRun, structuredLog } from '@/lib/observability';
import { isMercadoPagoApproved } from '@/lib/payment-status';

const BATCH_LIMIT = 50;

// Reprocessa pedidos cujo pagamento foi confirmado, mas cuja finalização
// transacional falhou no checkout (fallback `reconciliation_required`).
// finalize_checkout_order é idempotente: reexecutá-la não duplica nada.
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const isCron = Boolean(process.env.CRON_SECRET)
    && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron) {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;
  }

  const cronRun = await startCronRun('reconcile-checkout');
  const admin = getSupabaseAdmin();

  const { data: orders, error } = await admin
    .from('orders')
    .select('id, user_id, status, mp_payment_id, mp_status')
    .eq('checkout_state', 'reconciliation_required')
    .not('mp_payment_id', 'is', null)
    .order('created_at', { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) {
    await finishCronRun(cronRun, { status: 'failed', error });
    await captureOperationalError({ fingerprint: 'cron-reconcile-checkout-fetch', category: 'cron.failed', title: 'Falha ao buscar pedidos para reconciliação', error, route: '/api/cron/reconcile-checkout', alert: true });
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 });
  }

  let reconciled = 0;
  for (const order of orders ?? []) {
    const { error: finalizeError } = await admin.rpc('finalize_checkout_order', {
      p_order_id: order.id,
      p_user_id: order.user_id,
      p_mp_payment_id: String(order.mp_payment_id),
      p_mp_status: order.mp_status ?? 'unknown',
      // Mantém o status que o cliente já viu; só os efeitos pendentes são aplicados.
      p_order_status: order.status,
      p_consume_inventory: isMercadoPagoApproved(order.mp_status),
    });

    if (finalizeError) {
      await captureOperationalError({ fingerprint: 'cron-reconcile-checkout-order', category: 'cron.failed', title: 'Falha ao reconciliar pedido', error: finalizeError, orderId: order.id, severity: 'warning', alert: true });
      continue;
    }
    reconciled += 1;
  }

  await finishCronRun(cronRun, { status: 'success', processedCount: reconciled });
  structuredLog('info', 'cron.reconcile_checkout.completed', { processedCount: reconciled, found: orders?.length ?? 0 });
  return NextResponse.json({ found: orders?.length ?? 0, reconciled });
}

export const GET = POST;
