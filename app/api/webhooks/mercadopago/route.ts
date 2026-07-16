import { NextResponse } from 'next/server';
import { getPaymentClient } from '@/lib/mercadopago';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendOrderConfirmationEmail, sendInvoiceRequestEmail, sendAdminNewOrderEmail, sendOrderStatusEmail, sendSTLOrderConfirmationEmail, sendSTLAdminNotificationEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';
import { createAdminAlert } from '@/lib/admin-alerts';
import { verifyWebhookSignature } from '@/lib/security';
import { hasDigitalItems, hasPhysicalItems } from '@/lib/order-helpers';
import { isMercadoPagoApproved, mapMercadoPagoOrderStatus } from '@/lib/payment-status';
import { captureOperationalError, structuredLog } from '@/lib/observability';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  const dataObj = body.data as Record<string, unknown> | undefined;
  const requestUrl = new URL(request.url);
  const dataId = String(
    requestUrl.searchParams.get('data.id')
      ?? requestUrl.searchParams.get('data_id')
      ?? dataObj?.id
      ?? '',
  );

  if (webhookSecret) {
    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');
    const isValid = verifyWebhookSignature(dataId, xSignature, xRequestId, webhookSecret);
    if (!isValid) {
      await captureOperationalError({ fingerprint: 'mercadopago-webhook-invalid-signature', category: 'webhook.rejected', title: 'Webhook do Mercado Pago rejeitado', error: new Error('Assinatura inválida.'), route: '/api/webhooks/mercadopago', severity: 'warning', alert: true });
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
    }
  } else {
    structuredLog('error', 'mercadopago.webhook_not_configured');
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Webhook não configurado' }, { status: 503 });
    }
  }

  const type = body.type as string | undefined;
  const action = body.action as string | undefined;

  structuredLog('info', 'mercadopago.webhook_received', { type, action, providerPaymentId: dataId });

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

    const { data: orderByPayment } = await admin
      .from('orders')
      .select('id, status, user_id, checkout_coupon_id')
      .eq('mp_payment_id', String(paymentId))
      .maybeSingle();

    let order = orderByPayment;
    if (!order) {
      const metadata = result.metadata as Record<string, unknown> | undefined;
      const referencedOrderId = String(result.external_reference || metadata?.order_id || '');
      if (referencedOrderId) {
        const { data: orderByReference } = await admin
          .from('orders')
          .select('id, status, user_id, checkout_coupon_id')
          .eq('id', referencedOrderId)
          .maybeSingle();
        order = orderByReference;
      }
    }

    if (!order) {
      structuredLog('warn', 'mercadopago.order_not_found', { providerPaymentId: paymentId });
      return NextResponse.json({ received: true });
    }

    structuredLog('info', 'mercadopago.order_found', { orderId: order.id, currentStatus: order.status, providerStatus: mpStatus });

    const isPaymentApproved = isMercadoPagoApproved(mpStatus);
    let newStatus = mapMercadoPagoOrderStatus(mpStatus, false, order.status as import('@/types/database').OrderStatus);

    if (isPaymentApproved) {
      // Check if order contains only digital products for auto-completion
      const { data: orderItemsForType } = await admin
        .from('order_items')
        .select('product_id, product:products(type)')
        .eq('order_id', order.id);

      const isDigitalOrder = orderItemsForType?.every(
        (item) => (item.product as unknown as { type: string } | null)?.type === 'digital'
      ) ?? false;

      newStatus = mapMercadoPagoOrderStatus(mpStatus, isDigitalOrder, order.status as import('@/types/database').OrderStatus);
    }

    if (newStatus === order.status) {
      return NextResponse.json({ received: true });
    }

    // Skip notifications if order is already refunded (manual refund already processed)
    if (order.status === 'refunded') {
      structuredLog('info', 'mercadopago.refunded_order_skipped', { orderId: order.id });
      // Still update mp_status but don't change order status
      await admin
        .from('orders')
        .update({ mp_status: mpStatus })
        .eq('id', order.id);
      return NextResponse.json({ received: true });
    }

    const shouldConsumeInventory = isPaymentApproved && order.status === 'awaiting_payment';
    const { data: finalizedRows, error: finalizeError } = await admin.rpc('finalize_checkout_order', {
      p_order_id: order.id,
      p_user_id: order.user_id,
      p_mp_payment_id: String(paymentId),
      p_mp_status: mpStatus,
      p_order_status: newStatus,
      p_consume_inventory: shouldConsumeInventory,
    });
    if (finalizeError) {
      throw new Error(`Falha ao finalizar pedido pelo webhook: ${finalizeError.message}`);
    }
    const finalizedCheckout = Array.isArray(finalizedRows) ? finalizedRows[0] : finalizedRows;
    if (finalizedCheckout?.state_changed === false) {
      return NextResponse.json({ received: true, status: newStatus });
    }

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
        }).catch((error) => structuredLog('warn', 'admin_alert.create_failed', { error }));
      }
    } catch (e) {
      structuredLog('warn', 'mercadopago.notification_failed', { error: e, orderId: order.id });
    }

    if (newStatus === 'canceled' || newStatus === 'refunded') {
      const { data: customer } = await admin
        .from('users')
        .select('email, name')
        .eq('id', order.user_id)
        .single();

      if (customer?.email) {
        await sendOrderStatusEmail({
          email: customer.email,
          nome: customer.name ?? null,
          orderId: order.id,
          newStatus,
          refundAmount: newStatus === 'refunded' ? Number(result.transaction_amount) : undefined,
        });
      }
    }

    if (newStatus === 'rejected' && (order.status === 'approved' || order.status === 'processing')) {
      // Restore stock if payment was rejected after approval
      const { data: items } = await admin
        .from('order_items')
        .select('*, option:product_options(*)')
        .eq('order_id', order.id);

      if (items) {
        const exclusiveProductIds = items
          .filter((item) => item.product?.category === 'encomenda')
          .map((item) => item.product_id);

        if (exclusiveProductIds.length > 0) {
          await admin
            .from('print_requests')
            .update({ status: 'paid' })
            .in('product_id', exclusiveProductIds)
            .eq('user_id', order.user_id);
        }

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
        structuredLog('warn', 'mercadopago.notification_failed', { error: e, orderId: order.id });
      }

      const metadata = result.metadata as Record<string, unknown> | undefined;
      if (metadata?.coupon_id && !order.checkout_coupon_id) {
        await admin.rpc('increment_coupon_usage', { coupon_id: metadata.coupon_id });
      }

      const { data: userData } = await admin
        .from('users')
        .select('email, name')
        .eq('id', order.user_id)
        .single();

      if (userData?.email) {
        structuredLog('info', 'mercadopago.order_emails_prepared', {
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
        }).catch((error) => structuredLog('warn', 'mercadopago.email_failed', { error, orderId: order.id }));

        // Determine order type for admin email
        const isDigitalWebhook = (items || []).some(
          (item) => (item.product as Record<string, unknown>)?.type === 'digital' ||
                   (item.product_snapshot as Record<string, unknown>)?.type === 'digital'
        );
        const isPhysicalWebhook = (items || []).some(
          (item) => (item.product as Record<string, unknown>)?.type === 'physical' ||
                   (item.product_snapshot as Record<string, unknown>)?.type === 'physical'
        );
        const orderType = isDigitalWebhook && !isPhysicalWebhook ? 'stl' : 
                         isDigitalWebhook && isPhysicalWebhook ? 'mixed' : 'physical';

        sendAdminNewOrderEmail({
          adminEmail: process.env.ADMIN_EMAIL || 'studiohellou@gmail.com',
          orderId: order.id,
          customerName: userData.name || null,
          customerEmail: userData.email,
          total: Number(result.transaction_amount) || 0,
          orderType,
        }).catch((error) => structuredLog('warn', 'mercadopago.admin_email_failed', { error, orderId: order.id }));

        // Create admin alert for real-time notification
        createAdminAlert({
          type: 'new_order',
          title: `Novo pedido: ${isDigitalWebhook ? 'STL' : 'Produto físico'}`,
          body: `Cliente: ${userData.name || userData.email} | Total: R$ ${(Number(result.transaction_amount) || 0).toFixed(2)}`,
          priority: isDigitalWebhook ? 'normal' : 'high',
          related_order_id: order.id,
        }).catch((error) => structuredLog('warn', 'admin_alert.create_failed', { error }));

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
          }).catch((error) => structuredLog('warn', 'mercadopago.invoice_email_failed', { error, orderId: order.id }));
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
    await captureOperationalError({ fingerprint: 'mercadopago-webhook-handler', category: 'webhook.failed', title: 'Falha ao processar webhook do Mercado Pago', error: err, route: '/api/webhooks/mercadopago', severity: 'critical', alert: true });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
