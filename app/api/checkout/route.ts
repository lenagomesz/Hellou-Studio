import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getStripe, getAppBaseUrl } from '@/lib/stripe';
import { badRequest, requireUser, serverError } from '@/lib/api';
import { computeUnitPrice, type CartItemView } from '@/lib/cart';
import { calculateShipping, sanitizeCep, type ShippingOption } from '@/lib/shipping';
import { SUCCESSFUL_ORDER_STATUSES, validateCheckoutCoupon } from '@/lib/checkout-rules';
import type { CartItem, Product, ProductOption } from '@/types/database';

type RawCartRow = CartItem & {
  product: Pick<
    Product,
    'id' | 'name' | 'base_price' | 'image_url' | 'category' | 'type' | 'active' | 'is_customizable'
  > | null;
  option:
    | Pick<ProductOption, 'id' | 'product_id' | 'name' | 'price_modifier' | 'stock' | 'color'>
    | null;
};

function toView(row: RawCartRow): CartItemView | null {
  if (!row.product) return null;
  return {
    id: row.id,
    product_id: row.product_id,
    product_option_id: row.product_option_id,
    quantity: row.quantity,
    customization_text: row.customization_text ?? null,
    created_at: row.created_at,
    product: {
      id: row.product.id,
      name: row.product.name,
      base_price: row.product.base_price,
      image_url: row.product.image_url,
      category: row.product.category,
      type: row.product.type,
    },
    option: row.option
      ? {
          id: row.option.id,
          name: row.option.name,
          price_modifier: row.option.price_modifier,
          stock: row.option.stock,
          color: row.option.color,
        }
      : null,
  };
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  let shippingId: string | undefined;
  let shippingCep: string | undefined;
  let couponCode: string | undefined;
  let clientShippingAddress: Record<string, string> | undefined;
  try {
    const body = await request.json();
    shippingId = typeof body.shippingId === 'string' ? body.shippingId : undefined;
    shippingCep = typeof body.shippingCep === 'string' ? body.shippingCep : undefined;
    couponCode = typeof body.couponCode === 'string' ? body.couponCode.trim().toUpperCase() : undefined;
    if (body.shippingAddress && typeof body.shippingAddress === 'object') {
      clientShippingAddress = body.shippingAddress;
    }
  } catch {
    // empty body is fine — shipping becomes optional
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('cart_items')
    .select(
      'id, user_id, product_id, product_option_id, quantity, customization_text, created_at, product:products(id, name, base_price, image_url, category, type, active, is_customizable), option:product_options(id, product_id, name, price_modifier, stock, color)',
    )
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: true });

  if (error) return serverError('Erro ao buscar carrinho');

  const rows = (data ?? []) as unknown as RawCartRow[];
  const incompleteCustomization = rows.find((row) => row.product?.is_customizable && !row.customization_text?.trim());
  if (incompleteCustomization) return badRequest(`Preencha a personalização de ${incompleteCustomization.product?.name ?? 'um produto'}`);
  const items = rows
    .filter((row) => row.product && row.product.active !== false)
    .map(toView)
    .filter((item): item is CartItemView => item !== null);

  if (items.length === 0) return badRequest('Carrinho vazio');

  for (const item of items) {
    const stock = item.option?.stock;
    if (typeof stock === 'number' && item.quantity > stock) {
      return badRequest(`Estoque insuficiente para ${item.product.name}`);
    }
  }

  const subtotal = items.reduce((sum, item) => sum + computeUnitPrice(item) * item.quantity, 0);

  if (subtotal < 15) {
    return badRequest('O valor mínimo para compra é R$15,00');
  }

  const freeShippingBySubtotal = subtotal >= 99;

  const { count: orderCount } = await admin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .in('status', [...SUCCESSFUL_ORDER_STATUSES]);

  const isFirstPurchase = (orderCount ?? 0) === 0;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
    (item) => {
      const unit = computeUnitPrice(item);
      const variant = item.option ? ` — ${item.option.name}` : '';
      const productData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData.ProductData =
        {
          name: `${item.product.name}${variant}`,
          metadata: {
            product_id: item.product.id,
            product_option_id: item.option?.id ?? '',
          },
        };
      if (item.product.image_url && item.product.image_url.startsWith('https://')) {
        productData.images = [item.product.image_url];
      }
      return {
        quantity: item.quantity,
        price_data: {
          currency: 'brl',
          unit_amount: Math.round(unit * 100),
          product_data: productData,
        },
      };
    },
  );

  const couponValidation = await validateCheckoutCoupon(admin, couponCode, subtotal, auth.user.id);
  if (couponValidation && !couponValidation.valid) return badRequest(couponValidation.error);
  const validCoupon = couponValidation?.valid ? couponValidation.value.coupon : null;
  const validCouponDiscount = couponValidation?.valid ? couponValidation.value.discountAmount : 0;
  const isDigitalOrder = items.every((item) => item.product.type === 'digital');
  const hasFreeShipping = isDigitalOrder || validCoupon?.free_shipping === true || freeShippingBySubtotal;

  let shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] | undefined;

  if (!hasFreeShipping) {
    if (!shippingId || !shippingCep || !sanitizeCep(shippingCep)) {
      return badRequest('Selecione uma opção de frete válida');
    }
    try {
      const shippingResult = await calculateShipping(shippingCep);
      const selected: ShippingOption | undefined = shippingResult.options.find(
        (o) => o.id === shippingId,
      );
      if (selected) {
        shippingOptions = [
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: { amount: Math.round(selected.price * 100), currency: 'brl' },
              display_name: `${selected.name} - Correios`,
              delivery_estimate: {
                minimum: { unit: 'business_day', value: selected.days_min },
                maximum: { unit: 'business_day', value: selected.days_max },
              },
            },
          },
        ];
      } else {
        return badRequest('Opção de frete indisponível para este CEP');
      }
    } catch (error) {
      console.error('[checkout] shipping validation error:', error);
      return badRequest('Não foi possível validar o frete. Calcule novamente e tente outra vez.');
    }
  }

  const base = getAppBaseUrl();

  try {
    const stripe = getStripe();
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: lineItems,
      success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/cart`,
      client_reference_id: auth.user.id,
      customer_email: auth.user.email,
      metadata: {
        user_id: auth.user.id,
        ...(clientShippingAddress ? { shipping_address_json: JSON.stringify(clientShippingAddress) } : {}),
      },
    };

    if (!clientShippingAddress && !isDigitalOrder) {
      sessionParams.shipping_address_collection = { allowed_countries: ['BR'] };
    }

    if (!isDigitalOrder && hasFreeShipping) {
      const label = freeShippingBySubtotal ? 'Frete grátis (acima de R$99)' : 'Frete grátis (cupom)';
      sessionParams.shipping_options = [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 0, currency: 'brl' },
            display_name: label,
          },
        },
      ];
    } else if (shippingOptions) {
      sessionParams.shipping_options = shippingOptions;
    }

    if (validCoupon) {
      const stripeCoupon = await stripe.coupons.create(
        validCoupon.discount_type === 'percent'
          ? { percent_off: validCoupon.discount_value, currency: 'brl', duration: 'once' }
          : { amount_off: Math.round(validCouponDiscount * 100), currency: 'brl', duration: 'once' },
      );
      sessionParams.discounts = [{ coupon: stripeCoupon.id }];
      sessionParams.metadata!.coupon_id = validCoupon.id;
      sessionParams.metadata!.coupon_code = validCoupon.code;
    } else if (isFirstPurchase) {
      const firstPurchaseCoupon = await stripe.coupons.create({
        percent_off: 10,
        currency: 'brl',
        duration: 'once',
      });
      sessionParams.discounts = [{ coupon: firstPurchaseCoupon.id }];
      sessionParams.metadata!.first_purchase_discount = 'true';
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) return serverError('Stripe não retornou URL');

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('[checkout] Stripe error', err);
    return serverError('Erro ao criar sessão de pagamento');
  }
}
