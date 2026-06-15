import { NextResponse } from 'next/server';
import { getPaymentClient } from '@/lib/mercadopago';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = body.type as string | undefined;
  const action = body.action as string | undefined;

  if (type !== 'payment' || action !== 'payment.updated') {
    return NextResponse.json({ received: true });
  }

  const dataObj = body.data as Record<string, unknown> | undefined;
  const paymentId = dataObj?.id as string | undefined;

  if (!paymentId) {
    return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
  }

  try {
    const payment = getPaymentClient();
    const result = await payment.get({ id: paymentId });

    const mpStatus = result.status;
    if (!mpStatus) {
      return NextResponse.json({ received: true });
    }

    const admin = getSupabaseAdmin();

    const { data: order } = await admin
      .from('orders')
      .select('id, status, user_id')
      .eq('mp_payment_id', String(paymentId))
      .maybeSingle();

    if (!order) {
      console.warn('[mp-webhook] order not found for payment:', paymentId);
      return NextResponse.json({ received: true });
    }

    const newStatus = mpStatus === 'approved' ? 'pending' : mpStatus === 'cancelled' ? 'canceled' : order.status;

    if (newStatus === order.status) {
      return NextResponse.json({ received: true });
    }

    await admin
      .from('orders')
      .update({ status: newStatus, mp_status: mpStatus })
      .eq('id', order.id);

    try {
      if (newStatus === 'canceled' && order.status !== 'canceled') {
        await createNotification(
          order.user_id,
          'order_status',
          'Pagamento expirado',
          `O PIX do pedido #${order.id.slice(0, 8).toUpperCase()} expirou ou foi cancelado. Faça um novo pedido se desejar.`,
          { order_id: order.id, event: 'payment_cancelled' },
        );
      }
    } catch (e) {
      console.error('[mp-webhook] notification error:', e);
    }

    if (newStatus === 'pending' && order.status === 'awaiting_payment') {
      const { data: items } = await admin
        .from('order_items')
        .select('*, option:product_options(*)')
        .eq('order_id', order.id);

      if (items) {
        for (const item of items) {
          if (item.product_option_id) {
            await admin
              .from('product_options')
              .update({ stock: Math.max(0, (item.option?.stock ?? 0) - item.quantity) })
              .eq('id', item.product_option_id);
          }
        }
      }

      await admin.from('cart_items').delete().eq('user_id', order.user_id);

      try {
        await createNotification(
          order.user_id,
          'order_status',
          'PIX confirmado!',
          `O pagamento do pedido #${order.id.slice(0, 8).toUpperCase()} foi aprovado. Já estamos preparando!`,
          { order_id: order.id, event: 'pix_approved' },
        );
      } catch (e) {
        console.error('[mp-webhook] notification error:', e);
      }

      const metadata = result.metadata as Record<string, unknown> | undefined;
      if (metadata?.coupon_id) {
        await admin.rpc('increment_coupon_usage', { coupon_id: metadata.coupon_id });
      }

      const { data: userData } = await admin
        .from('users')
        .select('email, name')
        .eq('id', order.user_id)
        .single();

      if (userData?.email) {
        try {
          await sendOrderConfirmationEmail({
            email: userData.email,
            nome: userData.name || null,
            pedidoId: order.id,
            total: Number(result.transaction_amount) || 0,
            itens: (items || []).map((item) => ({
              nome: (item.product_snapshot as Record<string, unknown>)?.name as string || 'Produto',
              quantidade: item.quantity,
              precoUnitario: item.unit_price,
            })),
          });
        } catch (e) {
          console.error('[mp-webhook] email error:', e);
        }
      }
    }

    return NextResponse.json({ received: true, status: newStatus });
  } catch (err: unknown) {
    console.error('[mp-webhook] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
