import { NextResponse } from 'next/server';
import { requireUser, badRequest, serverError } from '@/lib/api';
import { getPaymentClient } from '@/lib/mercadopago';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isValidCpf } from '@/lib/cpf';
import { validateCartProductTypes } from '@/lib/cart';
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail, sendInvoiceRequestEmail, sendSTLDeliveryEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';
import { validateShippingCost } from '@/lib/security';

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const {
    payment_method,
    token,
    installments = 1,
    issuer_id,
    cpf,
    shipping_address,
    shipping_cost = 0,
    coupon_code,
    wants_invoice = false,
  } = body as {
    payment_method: 'pix' | 'credit_card' | 'debit_card';
    token?: string;
    installments?: number;
    issuer_id?: string;
    cpf?: string;
    shipping_address?: Record<string, unknown>;
    shipping_cost?: number;
    coupon_code?: string;
    wants_invoice?: boolean;
  };

  if (!payment_method) return badRequest('Método de pagamento não informado');
  if ((payment_method === 'credit_card' || payment_method === 'debit_card') && !token) {
    return badRequest('Token do cartão é obrigatório');
  }

  const payerCpf = typeof cpf === 'string' ? cpf.replace(/\D/g, '') : '';
  if (!payerCpf || !isValidCpf(payerCpf)) {
    return badRequest('CPF válido é obrigatório para pagamento');
  }

  const admin = getSupabaseAdmin();

  const { data: cartItems } = await admin
    .from('cart_items')
    .select('*, product:products(*), option:product_options(*)')
    .eq('user_id', user.id);

  if (!cartItems || cartItems.length === 0) {
    return badRequest('Carrinho vazio');
  }

  // Validate no mixed product types (digital + physical)
  try {
    validateCartProductTypes(cartItems.filter(i => i.product) as Array<{ product: { type: string } }>);
  } catch (e) {
    return badRequest((e as Error).message);
  }

  // Validate STL products can only be purchased once per user
  const stlItems = cartItems.filter(item => item.product?.type === 'digital');
  for (const stlItem of stlItems) {
    if (!stlItem.product_id) continue;

    const { data: existingPurchase } = await admin
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('payment_provider', 'mercadopago')
      .in('status', ['completed', 'processing', 'paid', 'shipped', 'delivered'])
      .single();

    if (existingPurchase) {
      const { count: hasPurchasedStl } = await admin
        .from('order_items')
        .select('id', { count: 'exact', head: true })
        .eq('order_id', existingPurchase.id)
        .eq('product_id', stlItem.product_id);

      if ((hasPurchasedStl ?? 0) > 0) {
        const productName = stlItem.product?.name || 'Arquivo STL';
        return badRequest(`Você já adquiriu "${productName}". Cada arquivo STL pode ser comprado apenas uma vez.`);
      }
    }
  }

  let subtotal = 0;
  for (const item of cartItems) {
    const basePrice = item.product?.base_price ?? 0;
    const modifier = item.option?.price_modifier ?? 0;
    subtotal += (basePrice + modifier) * item.quantity;
  }

  // Check if first purchase for 10% discount
  const { count: orderCount } = await admin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['completed', 'paid', 'processing', 'shipped', 'delivered']);

  const isFirstPurchase = (orderCount ?? 0) === 0;
  const firstPurchaseDiscount = isFirstPurchase ? subtotal * 0.1 : 0;

  let discountAmount = 0;
  let couponId: string | null = null;

  if (coupon_code) {
    const { data: coupon } = await admin
      .from('coupons')
      .select('*')
      .eq('code', coupon_code.toUpperCase())
      .eq('active', true)
      .maybeSingle();

    if (coupon) {
      if (coupon.discount_type === 'percent') {
        discountAmount = subtotal * (coupon.discount_value / 100);
      } else {
        discountAmount = coupon.discount_value;
      }
      couponId = coupon.id;
    }
  }

  const validatedShipping = validateShippingCost(shipping_cost);
  const totalAmount = Math.max(0, subtotal - firstPurchaseDiscount - discountAmount + validatedShipping);

  if (totalAmount < 0.01) {
    return badRequest('O valor do pedido deve ser maior que R$ 0,01');
  }

  const { data: userData } = await admin
    .from('users')
    .select('name, email')
    .eq('id', user.id)
    .single();

  console.log('[mp-create] userData fetched:', {
    user_id: user.id,
    userData_email: userData?.email,
    userData_name: userData?.name,
  });

  const nameParts = (userData?.name || 'Cliente').split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || firstName;

  try {
    const payment = getPaymentClient();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const notificationUrl = `${appUrl}/api/webhooks/mercadopago`;

    const paymentBody: Record<string, unknown> = {
      transaction_amount: Math.round(totalAmount * 100) / 100,
      description: `Pedido - ${cartItems.length} item(ns)`,
      notification_url: notificationUrl,
      payer: {
        email: userData?.email || user.email,
        first_name: firstName || 'Cliente',
        last_name: lastName || 'Cliente',
        identification: { type: 'CPF', number: payerCpf },
      },
      metadata: {
        user_id: user.id,
        coupon_id: couponId || null,
      },
    };

    if (payment_method === 'pix') {
      paymentBody.payment_method_id = 'pix';
    } else if (payment_method === 'credit_card' || payment_method === 'debit_card') {
      if (!token) {
        return badRequest('Token do cartão é obrigatório');
      }
      paymentBody.token = token;
      paymentBody.installments = Math.max(1, Math.min(12, Number(installments) || 1));
      if (issuer_id) paymentBody.issuer_id = issuer_id;
    }

    console.log('[mp-create] creating payment:', {
      method: payment_method,
      amount: paymentBody.transaction_amount,
      items: cartItems.length,
      user: user.id,
    });
    const result = await payment.create({ body: paymentBody });

    const mpPaymentId = String(result.id);
    const mpStatus = result.status;

    console.log('[mp-create] Payment created:', {
      paymentId: mpPaymentId,
      status: mpStatus,
      itemCount: cartItems.length,
    });

    // Check if order contains only digital products
    const isDigitalOrder = cartItems.every(item => item.product?.type === 'digital');

    let orderStatus: string;
    if (mpStatus === 'approved') {
      // For digital orders: go to 'approved' (file will be available)
      // For physical orders: go to 'processing'
      orderStatus = isDigitalOrder ? 'approved' : 'processing';
    } else {
      orderStatus = 'awaiting_payment';
    }

    console.log('[mp-create] Order status set:', {
      mpStatus,
      isDigitalOrder,
      orderStatus,
    });

    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        user_id: user.id,
        mp_payment_id: mpPaymentId,
        mp_payment_method: payment_method,
        mp_status: mpStatus ?? null,
        payment_provider: 'mercadopago',
        status: orderStatus,
        total: totalAmount,
        shipping_address: { ...shipping_address, wants_invoice: !!wants_invoice },
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('[mp-create] order insert error:', orderError);
      return serverError('Erro ao criar pedido');
    }

    const orderItems = cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_option_id: item.product_option_id,
      quantity: item.quantity,
      unit_price: (item.product?.base_price ?? 0) + (item.option?.price_modifier ?? 0),
      product_snapshot: {
        name: item.product?.name,
        image_url: item.product?.image_url,
        option_name: item.option?.name,
        option_color: item.option?.color,
      },
    }));

    await admin.from('order_items').insert(orderItems);

    if (mpStatus === 'rejected') {
      await admin.from('order_items').delete().eq('order_id', order.id);
      await admin.from('orders').delete().eq('id', order.id);
    } else {
      await admin.from('cart_items').delete().eq('user_id', user.id);
    }

    if (orderStatus === 'processing' || orderStatus === 'completed') {
      for (const item of cartItems) {
        if (item.product_option_id) {
          const { error: rpcErr } = await admin.rpc('decrement_stock', {
            option_id: item.product_option_id,
            qty: item.quantity,
          });
          if (rpcErr) {
            await admin
              .from('product_options')
              .update({ stock: Math.max(0, (item.option?.stock ?? 0) - item.quantity) })
              .eq('id', item.product_option_id ?? '');
          }
        }
      }

      if (couponId) {
        await admin.rpc('increment_coupon_usage', { coupon_id: couponId });
      }

      try {
        // Create different notifications based on product type
        if (isDigitalOrder) {
          await createNotification(
            user.id,
            'order_status',
            'Pagamento aprovado! ✅',
            `Seu arquivo STL está pronto para download em #${order.id.slice(0, 8).toUpperCase()}.`,
            { order_id: order.id, event: 'card_approved' },
          );
        } else {
          await createNotification(
            user.id,
            'order_status',
            'Pagamento aprovado!',
            `Seu pedido #${order.id.slice(0, 8).toUpperCase()} foi confirmado e já está sendo preparado.`,
            { order_id: order.id, event: 'card_approved' },
          );
        }
      } catch (e) {
        console.error('[mp-create] notification error:', e);
      }

      // Send order confirmation email
      const customerEmail = userData?.email || user.email;
      console.log('[mp-create] Order confirmation email:', {
        userData_email: userData?.email,
        user_email: user.email,
        final_email: customerEmail,
        user_id: user.id,
      });
      sendOrderConfirmationEmail({
        email: customerEmail,
        nome: userData?.name || null,
        pedidoId: order.id,
        total: totalAmount,
        itens: orderItems.map((item) => ({
          nome: (item.product_snapshot as Record<string, unknown>)?.name as string || 'Produto',
          quantidade: item.quantity,
          precoUnitario: item.unit_price,
        })),
      }).catch((e) => console.error('[mp-create] email error:', e));

      // Handle STL delivery notifications and emails
      const stlItems = orderItems.filter(item => (item.product_snapshot as Record<string, unknown>)?.type === 'digital');
      console.log('[mp-create] STL items found:', {
        stlCount: stlItems.length,
        mpStatus,
        shouldSendEmail: stlItems.length > 0 && mpStatus === 'approved',
      });

      if (stlItems.length > 0 && mpStatus === 'approved') {
        // For digital-only orders: notify immediately
        if (isDigitalOrder) {
          try {
            await createNotification(
              user.id,
              'order_status',
              'Seu arquivo está pronto! ✨',
              `Acesse seu pedido #${order.id.slice(0, 8).toUpperCase()} para baixar os arquivos STL.`,
              { order_id: order.id, event: 'stl_delivered' },
            );
          } catch (e) {
            console.error('[mp-create] stl notification error:', e);
          }
        } else {
          // For mixed orders: notify that STL is available (even if order is processing)
          try {
            await createNotification(
              user.id,
              'order_status',
              'Arquivo STL disponível! 📥',
              `Seu arquivo STL já está disponível para download em #${order.id.slice(0, 8).toUpperCase()}, enquanto preparamos seu pedido.`,
              { order_id: order.id, event: 'stl_available' },
            );
          } catch (e) {
            console.error('[mp-create] mixed order stl notification error:', e);
          }
        }

        // Send STL delivery email with file info
        let stlEmailSent = false;
        for (const stlItem of stlItems) {
          const fileName = (stlItem.product_snapshot as Record<string, unknown>)?.name as string || 'Arquivo STL';
          const emailSent = await sendSTLDeliveryEmail({
            email: userData?.email || user.email,
            nome: userData?.name || null,
            orderId: order.id,
            fileName: fileName,
          }).catch((e) => {
            console.error('[mp-create] stl delivery email error:', e);
            return false;
          });

          if (emailSent) {
            stlEmailSent = true;
          }
        }

        // If STL email was sent successfully, update order status to 'delivered'
        if (stlEmailSent && isDigitalOrder) {
          await admin
            .from('orders')
            .update({ status: 'delivered' })
            .eq('id', order.id);

          console.log('[mp-create] Order status updated to delivered after STL email sent:', {
            orderId: order.id,
          });
        }
      }

      sendAdminNewOrderEmail({
        adminEmail: process.env.ADMIN_EMAIL || userData?.email || user.email,
        orderId: order.id,
        customerName: userData?.name || null,
        customerEmail: userData?.email || user.email,
        total: totalAmount,
      }).catch((e) => console.error('[mp-create] admin email error:', e));

      if (wants_invoice) {
        sendInvoiceRequestEmail({
          adminEmail: process.env.ADMIN_EMAIL || userData?.email || user.email,
          orderId: order.id,
          customerName: userData?.name || null,
          customerEmail: userData?.email || user.email,
          total: totalAmount,
        }).catch((e) => console.error('[mp-create] invoice email error:', e));
      }
    }

    try {
      if (payment_method === 'pix' && orderStatus === 'awaiting_payment') {
        await createNotification(
          user.id,
          'order_status',
          'PIX gerado — aguardando pagamento',
          `Pague o PIX do pedido #${order.id.slice(0, 8).toUpperCase()} em até 30 minutos para confirmar.`,
          { order_id: order.id, event: 'pix_pending' },
        );
      }

      if (mpStatus === 'rejected') {
        await createNotification(
          user.id,
          'order_status',
          'Pagamento recusado',
          `O pagamento do pedido #${order.id.slice(0, 8).toUpperCase()} foi recusado. Tente novamente com outro cartão.`,
          { order_id: order.id, event: 'card_rejected' },
        );
      }
    } catch (e) {
      console.error('[mp-create] notification error:', e);
    }

    const responseData: Record<string, unknown> = {
      payment_id: mpPaymentId,
      status: mpStatus,
      order_id: order.id,
    };

    if (payment_method === 'pix' && result.point_of_interaction) {
      const txData = (result.point_of_interaction as Record<string, unknown>).transaction_data as Record<string, unknown> | undefined;
      responseData.pix_qr_code = txData?.qr_code;
      responseData.pix_qr_code_base64 = txData?.qr_code_base64;
      responseData.pix_expiration = result.date_of_expiration;
    }

    if (mpStatus === 'rejected') {
      responseData.status_detail = result.status_detail;
    }

    return NextResponse.json(responseData);
  } catch (err: unknown) {
    console.error('[mp-create] payment error stack:', err instanceof Error ? err.stack : String(err));
    const mpErr = err as { status?: number; statusCode?: number; message?: string; cause?: unknown[]; apiResponse?: unknown };
    console.error('[mp-create] payment error details:', {
      message: mpErr.message,
      status: mpErr.status ?? mpErr.statusCode,
      cause: mpErr.cause,
      apiResponse: mpErr.apiResponse,
    });

    const errStatus = mpErr.status ?? mpErr.statusCode;
    if (errStatus && errStatus >= 400 && errStatus < 500) {
      const detail = Array.isArray(mpErr.cause)
        ? (mpErr.cause[0] as Record<string, unknown>)?.description
        : mpErr.message;
      return NextResponse.json(
        { error: typeof detail === 'string' ? detail : 'Dados de pagamento inválidos', mp_error: true },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : 'Erro ao processar pagamento';
    console.error('[mp-create] returning error response:', message);
    return serverError(message);
  }
}
