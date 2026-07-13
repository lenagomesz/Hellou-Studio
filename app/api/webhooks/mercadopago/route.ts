import { NextResponse } from 'next/server';
import { getPaymentClient } from '@/lib/mercadopago';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendOrderConfirmationEmail, sendInvoiceRequestEmail, sendAdminNewOrderEmail, sendSTLOrderConfirmationEmail, sendSTLAdminNotificationEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';
import { createAdminAlert } from '@/lib/admin-alerts';
import { verifyWebhookSignature } from '@/lib/security';
import { hasDigitalItems, hasPhysicalItems, type OrderItemWithProduct } from '@/lib/order-helpers';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  const dataObj = body.data as Record<string, unknown> | undefined;
  const dataId = String(dataObj?.id ?? '');

  if (webhookSecret) {
    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');
    const isValid = verifyWebhookSignature(dataId, xSignature, xRequestId, webhookSecret);
    if (!isValid) {
      console.warn('[mp-webhook] Invalid signature — processing anyway (signature mismatch)', {
        hasXSignature: !!xSignature,
        hasXRequestId: !!xRequestId,
        dataId,
      });
    }
  } else {
    console.warn('[mp-webhook] MERCADO_PAGO_WEBHOOK_SECRET not set — skipping signature verification');
  }

  const type = body.type as string | undefined;
  const action = body.action as string | undefined;

  console.log('[mp-webhook] received:', { type, action, dataId, body: JSON.stringify(body) });

  if (type !== 'payment' || (action !== 'payment.updated' && action !== 'payment.created')) {
    return NextResponse.json({ received: true });
  }

  const paymentId = dataId;

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
      console.warn('[mp-webhook] order not found for payment:', paymentId, '(type:', typeof paymentId, ')');
      return NextResponse.json({ received: true });
    }

    console.log('[mp-webhook] found order:', { orderId: order.id, currentStatus: order.status, mpStatus });

    // Determine new order status
    let newStatus: string;
    // 'approved' = confirmed, 'authorized' = authorized (card payments), 'in_process' = processing
    const isPaymentApproved = ['approved', 'authorized', 'in_process'].includes(mpStatus);

    if (isPaymentApproved) {
      // Check if order contains only digital products for auto-completion
      const { data: orderItemsForType } = await admin
        .from('order_items')
        .select('product_id, product:products(type)')
        .eq('order_id', order.id);

      const isDigitalOrder = orderItemsForType?.every(
        (item) => (item.product as unknown as { type: string } | null)?.type === 'digital'
      ) ?? false;

      newStatus = isDigitalOrder ? 'approved' : 'processing';
    } else if (mpStatus === 'cancelled') {
      newStatus = 'canceled';
    } else if (['rejected', 'declined', 'refunded'].includes(mpStatus)) {
      newStatus = 'rejected';
    } else {
      newStatus = order.status;
    }

    if (newStatus === order.status) {
      return NextResponse.json({ received: true });
    }

    // Skip notifications if order is already refunded (manual refund already processed)
    if (order.status === 'refunded') {
      console.log('[mp-webhook] Order already refunded, skipping notifications:', order.id);
      // Still update mp_status but don't change order status
      await admin
        .from('orders')
        .update({ mp_status: mpStatus })
        .eq('id', order.id);
      return NextResponse.json({ received: true });
    }

    const updateData: Record<string, unknown> = { status: newStatus, mp_status: mpStatus };
    if (newStatus === 'completed') {
      updateData.shipped_at = new Date().toISOString();
    }

    await admin
      .from('orders')
      .update(updateData)
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
      } else if (newStatus === 'rejected' && order.status !== 'rejected') {
        await createNotification(
          order.user_id,
          'order_status',
          'Pagamento recusado',
          `O pagamento do pedido #${order.id.slice(0, 8).toUpperCase()} foi recusado. Tente novamente ou use outro método de pagamento.`,
          { order_id: order.id, event: 'payment_rejected' },
        );

        // Create admin alert for rejected payment
        createAdminAlert({
          type: 'payment_rejected',
          title: `Pagamento rejeitado: Pedido #${order.id.slice(0, 8).toUpperCase()}`,
          body: 'Cliente será notificado para retentar',
          priority: 'urgent',
          related_order_id: order.id,
        }).catch(err => console.error('[admin-alerts] create failed:', err));
      }
    } catch (e) {
      console.error('[mp-webhook] notification error:', e);
    }

    if (newStatus === 'rejected' && (order.status === 'approved' || order.status === 'processing')) {
      // Restore stock if payment was rejected after approval
      const { data: items } = await admin
        .from('order_items')
        .select('*, option:product_options(*)')
        .eq('order_id', order.id);

      if (items) {
        for (const item of items) {
          if (item.product_option_id) {
            await admin
              .from('product_options')
              .update({ stock: (item.option?.stock ?? 0) + item.quantity })
              .eq('id', item.product_option_id);
          }
        }
      }
    }

    if ((newStatus === 'approved' || newStatus === 'processing') && order.status === 'awaiting_payment') {
      const { data: items } = await admin
        .from('order_items')
        .select('*, option:product_options(*), product:products(*)')
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
        const itemsData = items ?? [];
        const hasDigital = hasDigitalItems(itemsData);
        const hasPhysical = hasPhysicalItems(itemsData);

        let notifTitle = '';
        let notifBody = '';

        if (hasDigital && !hasPhysical) {
          notifTitle = '✨ Seu arquivo STL está pronto!';
          notifBody = 'Acesse sua conta para fazer download do arquivo';
        } else if (!hasDigital && hasPhysical) {
          notifTitle = '🎉 Pedido aprovado!';
          notifBody = 'Sua peça será impressa em até 3 dias úteis';
        } else {
          notifTitle = '📦 Arquivo pronto + Pedido em produção!';
          notifBody = 'Seu arquivo está disponível. A peça será impressa em até 3 dias úteis.';
        }

        await createNotification(
          order.user_id,
          'order_status',
          notifTitle,
          notifBody,
          { order_id: order.id, event: 'order_approved' },
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
        console.log('[mp-webhook] Enviando emails de confirmação:', {
          orderId: order.id,
          email: userData.email,
          itemCount: items?.length || 0,
        });

        sendOrderConfirmationEmail({
          email: userData.email,
          nome: userData.name || null,
          pedidoId: order.id,
          total: Number(result.transaction_amount) || 0,
          itens: (items || []).map((item) => ({
            nome: (item.product as Record<string, unknown>)?.name as string || 
                  (item.product_snapshot as Record<string, unknown>)?.name as string || 
                  'Produto',
            quantidade: item.quantity,
            precoUnitario: item.unit_price,
          })),
        }).catch((e) => console.error('[mp-webhook] email error:', e));

        sendAdminNewOrderEmail({
          adminEmail: process.env.ADMIN_EMAIL || 'studiohellou@gmail.com',
          orderId: order.id,
          customerName: userData.name || null,
          customerEmail: userData.email,
          total: Number(result.transaction_amount) || 0,
        }).catch((e) => console.error('[mp-webhook] admin email error:', e));

        // Create admin alert for real-time notification
        const isDigitalWebhook = (items || []).some(
          (item) => (item.product as Record<string, unknown>)?.type === 'digital' ||
                   (item.product_snapshot as Record<string, unknown>)?.type === 'digital'
        );
        createAdminAlert({
          type: 'new_order',
          title: `Novo pedido: ${isDigitalWebhook ? 'STL' : 'Produto físico'}`,
          body: `Cliente: ${userData.name || userData.email} | Total: R$ ${(Number(result.transaction_amount) || 0).toFixed(2)}`,
          priority: isDigitalWebhook ? 'normal' : 'high',
          related_order_id: order.id,
        }).catch(err => console.error('[admin-alerts] create failed:', err));

        const { data: orderFull } = await admin
          .from('orders')
          .select('shipping_address')
          .eq('id', order.id)
          .single();

        const shipping = orderFull?.shipping_address as Record<string, unknown> | null;
        if (shipping?.wants_invoice) {
          sendInvoiceRequestEmail({
            adminEmail: process.env.ADMIN_EMAIL || userData.email,
            orderId: order.id,
            customerName: userData.name || null,
            customerEmail: userData.email,
            total: Number(result.transaction_amount) || 0,
          }).catch((e) => console.error('[mp-webhook] invoice email error:', e));
        }

        // Send STL-specific emails for digital-only orders
        const hasDigitalItems = (items || []).some(
          (item) => (item.product as Record<string, unknown>)?.type === 'digital' ||
                   (item.product_snapshot as Record<string, unknown>)?.type === 'digital'
        );

        if (hasDigitalItems && newStatus === 'approved') {
          const digitalItem = (items || []).find(
            (item) => (item.product as Record<string, unknown>)?.type === 'digital' ||
                     (item.product_snapshot as Record<string, unknown>)?.type === 'digital'
          );
          const fileName = digitalItem
            ? ((digitalItem.product as Record<string, unknown>)?.name as string || 
               (digitalItem.product_snapshot as Record<string, unknown>)?.name as string || 
               'Arquivo STL')
            : 'Arquivo STL';

          await sendSTLOrderConfirmationEmail({
            email: userData.email,
            nome: userData.name || null,
            orderId: order.id,
            fileName,
            price: Number(result.transaction_amount) || 0,
          });

          await sendSTLAdminNotificationEmail({
            adminEmail: process.env.ADMIN_EMAIL || 'studiohellou@gmail.com',
            orderId: order.id,
            customerName: userData.name || null,
            customerEmail: userData.email,
            fileName,
            price: Number(result.transaction_amount) || 0,
          });
        }
      }
    }

    return NextResponse.json({ received: true, status: newStatus });
  } catch (err: unknown) {
    console.error('[mp-webhook] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
