import { NextResponse } from 'next/server';
import { requireUser, badRequest, serverError } from '@/lib/api';
import { getPaymentClient } from '@/lib/mercadopago';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isValidCpf } from '@/lib/cpf';
import { validateCartProductTypes } from '@/lib/cart';
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail, sendInvoiceRequestEmail } from '@/lib/email';
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

  let subtotal = 0;
  for (const item of cartItems) {
    const basePrice = item.product?.base_price ?? 0;
    const modifier = item.option?.price_modifier ?? 0;
    subtotal += (basePrice + modifier) * item.quantity;
  }

  // TODO: descomentar após testes em prod
  // if (subtotal < 15) {
  //   return badRequest('Pedido mínimo de R$15,00');
  // }

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
  const totalAmount = Math.max(0, subtotal - discountAmount + validatedShipping);

  const { data: userData } = await admin
    .from('users')
    .select('name, email')
    .eq('id', user.id)
    .single();

  const nameParts = (userData?.name || 'Cliente').split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || firstName;

  try {
    const payment = getPaymentClient();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}`;
    const notificationUrl = `${appUrl}/api/webhooks/mercadopago`;

    const paymentBody: Record<string, unknown> = {
      transaction_amount: Math.round(totalAmount * 100) / 100,
      description: `Pedido - ${cartItems.length} item(ns)`,
      payment_method_id: payment_method === 'pix' ? 'pix' : undefined,
      notification_url: notificationUrl,
      payer: {
        email: userData?.email || user.email,
        first_name: firstName,
        last_name: lastName,
        identification: { type: 'CPF', number: payerCpf },
      },
      metadata: {
        user_id: user.id,
        coupon_id: couponId,
      },
    };

    if (payment_method === 'credit_card' || payment_method === 'debit_card') {
      paymentBody.token = token;
      paymentBody.installments = Number(installments);
      if (issuer_id) paymentBody.issuer_id = issuer_id;
    }

    const result = await payment.create({ body: paymentBody as never });

    const mpPaymentId = String(result.id);
    const mpStatus = result.status;

    // Check if order contains only digital products
    const isDigitalOrder = cartItems.every(item => item.product?.type === 'digital');

    let orderStatus: string;
    if (mpStatus === 'approved') {
      orderStatus = isDigitalOrder ? 'completed' : 'processing';
    } else {
      orderStatus = 'awaiting_payment';
    }

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
        shipped_at: isDigitalOrder && mpStatus === 'approved' ? new Date().toISOString() : null,
        shipping_address: { ...(shipping_address ?? {}), wants_invoice: !!wants_invoice },
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
              .eq('id', item.product_option_id!);
          }
        }
      }

      if (couponId) {
        await admin.rpc('increment_coupon_usage', { coupon_id: couponId });
      }

      try {
        await createNotification(
          user.id,
          'order_status',
          'Pagamento aprovado!',
          `Seu pedido #${order.id.slice(0, 8).toUpperCase()} foi confirmado e já está sendo preparado.`,
          { order_id: order.id, event: 'card_approved' },
        );
      } catch (e) {
        console.error('[mp-create] notification error:', e);
      }

      sendOrderConfirmationEmail({
        email: userData?.email || user.email,
        nome: userData?.name || null,
        pedidoId: order.id,
        total: totalAmount,
        itens: orderItems.map((item) => ({
          nome: (item.product_snapshot as Record<string, unknown>)?.name as string || 'Produto',
          quantidade: item.quantity,
          precoUnitario: item.unit_price,
        })),
      }).catch((e) => console.error('[mp-create] email error:', e));

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
    const mpErr = err as { status?: number; statusCode?: number; message?: string; cause?: unknown[]; apiResponse?: unknown };
    console.error('[mp-create] payment error:', JSON.stringify({
      message: mpErr.message,
      status: mpErr.status ?? mpErr.statusCode,
      cause: mpErr.cause,
      apiResponse: mpErr.apiResponse,
    }, null, 2));

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
    return serverError(message);
  }
}
