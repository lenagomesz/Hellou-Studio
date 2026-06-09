import type Stripe from 'stripe';
import { getStripe, getStripeWebhookSecret } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from '@/lib/email';
import type { CartItem, Order, OrderItem, Product, ProductOption } from '@/types/database';

type CartRowForFulfillment = CartItem & {
  product: Pick<
    Product,
    'id' | 'name' | 'base_price' | 'image_url' | 'category' | 'active'
  > | null;
  option:
    | Pick<ProductOption, 'id' | 'product_id' | 'name' | 'price_modifier' | 'stock'>
    | null;
};

export async function POST(request: Request) {
  const stripe = getStripe();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Response(`Webhook error: ${message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await fulfillCheckoutSession(event.data.object);
        break;
      case 'checkout.session.expired':
        await markOrderAsCanceled(event.data.object.id);
        break;
      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntent =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id ?? null;
        if (paymentIntent) {
          await markOrderAsRefunded(paymentIntent);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('[stripe webhook] handler error', event.type, err);
    return new Response(
      `Webhook handler failed: ${err instanceof Error ? err.message : 'unknown'}`,
      { status: 500 },
    );
  }

  return new Response('Success!', { status: 200 });
}

async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  const admin = getSupabaseAdmin();
  const userId =
    session.metadata?.user_id ??
    (typeof session.client_reference_id === 'string'
      ? session.client_reference_id
      : null);
  if (!userId) {
    throw new Error('Sessão sem user_id');
  }

  const { data: existing } = await admin
    .from('orders')
    .select('id, status')
    .eq('stripe_session_id', session.id)
    .maybeSingle();

  const existingOrder = existing as Pick<Order, 'id' | 'status'> | null;
  if (existingOrder && existingOrder.status !== 'pending') {
    return;
  }

  const { data: cartRows, error: cartError } = await admin
    .from('cart_items')
    .select(
      'id, user_id, product_id, product_option_id, quantity, created_at, product:products(id, name, base_price, image_url, category, active), option:product_options(id, product_id, name, price_modifier, stock)',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (cartError) throw new Error(`Erro ao buscar carrinho: ${cartError.message}`);

  const rows = (cartRows ?? []) as unknown as CartRowForFulfillment[];
  const items = rows.filter((row) => row.product);

  if (items.length === 0) {
    if (existingOrder) return;
    throw new Error('Carrinho vazio ao processar checkout');
  }

  const total = items.reduce((sum, row) => {
    const unit =
      (row.product?.base_price ?? 0) + (row.option?.price_modifier ?? 0);
    return sum + unit * row.quantity;
  }, 0);

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  let shippingAddress: Record<string, unknown> | null = null;

  if (session.metadata?.shipping_address_json) {
    try {
      shippingAddress = JSON.parse(session.metadata.shipping_address_json);
    } catch { /* ignore parse error */ }
  }

  if (!shippingAddress) {
    shippingAddress = session.collected_information?.shipping_details
      ? {
          name: session.collected_information.shipping_details.name,
          ...session.collected_information.shipping_details.address,
        }
      : session.customer_details
        ? {
            name: session.customer_details.name,
            email: session.customer_details.email,
            ...(session.customer_details.address ?? {}),
          }
        : null;
  }

  let orderId: string;
  if (existingOrder) {
    orderId = existingOrder.id;
    const { error: updateError } = await admin
      .from('orders')
      .update({
        status: 'paid',
        total,
        stripe_payment_intent_id: paymentIntentId,
        shipping_address: shippingAddress,
      })
      .eq('id', orderId);
    if (updateError) {
      throw new Error(`Erro ao atualizar pedido: ${updateError.message}`);
    }
  } else {
    const { data: insertedOrder, error: insertError } = await admin
      .from('orders')
      .insert({
        user_id: userId,
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        status: 'paid',
        total,
        shipping_address: shippingAddress,
      })
      .select('id')
      .single();
    if (insertError || !insertedOrder) {
      throw new Error(
        `Erro ao criar pedido: ${insertError?.message ?? 'desconhecido'}`,
      );
    }
    orderId = (insertedOrder as Pick<Order, 'id'>).id;
  }

  const orderItemsPayload = items.map((row) => {
    const unit =
      (row.product?.base_price ?? 0) + (row.option?.price_modifier ?? 0);
    return {
      order_id: orderId,
      product_id: row.product_id,
      product_option_id: row.product_option_id,
      quantity: row.quantity,
      unit_price: unit,
      product_snapshot: {
        product: row.product,
        option: row.option,
      },
    } satisfies Partial<OrderItem> & {
      order_id: string;
      product_id: string;
      quantity: number;
      unit_price: number;
    };
  });

  if (!existingOrder) {
    const { error: itemsError } = await admin
      .from('order_items')
      .insert(orderItemsPayload);
    if (itemsError) {
      throw new Error(`Erro ao criar itens do pedido: ${itemsError.message}`);
    }
  }

  for (const row of items) {
    if (!row.option) continue;
    const newStock = Math.max(0, row.option.stock - row.quantity);
    const { error: stockError } = await admin
      .from('product_options')
      .update({ stock: newStock })
      .eq('id', row.option.id);
    if (stockError) {
      console.error('[stripe webhook] stock update error', stockError);
    }
  }

  const { error: clearError } = await admin
    .from('cart_items')
    .delete()
    .eq('user_id', userId);
  if (clearError) {
    console.error('[stripe webhook] cart clear error', clearError);
  }

  const { data: user } = await admin
    .from('users')
    .select('email, name')
    .eq('id', userId)
    .single();

  if (user) {
    await sendOrderConfirmationEmail({
      email: user.email,
      nome: user.name,
      pedidoId: orderId,
      total,
      itens: items.map((row) => ({
        nome: row.product?.name ?? 'Produto',
        quantidade: row.quantity,
        precoUnitario:
          (row.product?.base_price ?? 0) + (row.option?.price_modifier ?? 0),
      })),
    });
  }

  const { data: admins } = await admin
    .from('users')
    .select('email')
    .eq('role', 'admin')
    .limit(5);

  if (admins?.length) {
    const customerEmail = user?.email ?? session.customer_details?.email ?? '';
    const customerName = user?.name ?? null;
    for (const adm of admins) {
      await sendAdminNewOrderEmail({
        adminEmail: adm.email,
        orderId,
        customerName,
        customerEmail,
        total,
      }).catch(() => {});
    }
  }
}

async function markOrderAsCanceled(sessionId: string) {
  const admin = getSupabaseAdmin();
  await admin
    .from('orders')
    .update({ status: 'canceled' })
    .eq('stripe_session_id', sessionId)
    .eq('status', 'pending');
}

async function markOrderAsRefunded(paymentIntentId: string) {
  const admin = getSupabaseAdmin();
  await admin
    .from('orders')
    .update({ status: 'refunded' })
    .eq('stripe_payment_intent_id', paymentIntentId);
}
