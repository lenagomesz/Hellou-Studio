import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { badRequest, requireUser, serverError } from '@/lib/api';
import type { CartItemView } from '@/lib/cart';
import type { CartItem, Product, ProductOption } from '@/types/database';

type RawCartRow = CartItem & {
  product: Pick<
    Product,
    'id' | 'name' | 'base_price' | 'image_url' | 'category' | 'type' | 'active'
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

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('cart_items')
    .select(
      'id, user_id, product_id, product_option_id, quantity, customization_text, created_at, product:products(id, name, base_price, image_url, category, type, active), option:product_options(id, product_id, name, price_modifier, stock, color)',
    )
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: true });

  if (error) return serverError('Erro ao buscar carrinho');

  const rows = (data ?? []) as unknown as RawCartRow[];
  const items = rows
    .filter((row) => row.product && row.product.active !== false)
    .map(toView)
    .filter((item): item is CartItemView => item !== null);

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const { product_id, product_option_id, quantity, customization_text } = (body ?? {}) as {
    product_id?: string;
    product_option_id?: string | null;
    quantity?: number;
    customization_text?: string | null;
  };

  if (!product_id || typeof product_id !== 'string') {
    return badRequest('product_id é obrigatório');
  }

  const optionId = product_option_id ?? null;
  const normalizedCustomization = typeof customization_text === 'string' ? customization_text.trim() : '';
  if (normalizedCustomization.length > 500) return badRequest('A personalização deve ter no máximo 500 caracteres');
  const requestedQty =
    typeof quantity === 'number' && Number.isFinite(quantity)
      ? Math.floor(quantity)
      : 1;
  if (requestedQty < 1) return badRequest('Quantidade inválida');

  const admin = getSupabaseAdmin();

  const { data: productRow, error: productError } = await admin
    .from('products')
    .select('id, active, is_customizable')
    .eq('id', product_id)
    .maybeSingle();

  if (productError) {
    console.error('[cart] product lookup error:', productError);
    return serverError('Erro ao validar produto');
  }
  if (!productRow?.active) {
    console.error('[cart] product unavailable:', { product_id, productRow });
    return badRequest('Produto indisponível');
  }
  const product = productRow;
  if (product.is_customizable && !normalizedCustomization) {
    return badRequest('Preencha a personalização antes de adicionar ao carrinho');
  }

  let optionStock: number | null = null;
  if (optionId) {
    const { data: optionRow, error: optionError } = await admin
      .from('product_options')
      .select('id, product_id, stock')
      .eq('id', optionId)
      .maybeSingle();

    if (optionError) return serverError('Erro ao validar variação');
    if (!optionRow?.product_id || optionRow.product_id !== product_id) {
      return badRequest('Variação inválida');
    }
    optionStock = optionRow.stock;
  }

  const { data: matches, error: matchError } = await admin
    .from('cart_items')
    .select('id, quantity, product_option_id, customization_text')
    .eq('user_id', auth.user.id)
    .eq('product_id', product_id);

  if (matchError) return serverError('Erro ao verificar carrinho');

  const matchRows = (matches ?? []) as Pick<
    CartItem,
    'id' | 'quantity' | 'product_option_id' | 'customization_text'
  >[];
  const existing =
    matchRows.find((r) => r.product_option_id === optionId && (r.customization_text ?? '') === normalizedCustomization) ?? null;

  const cap = Math.min(optionStock ?? 50, 50);
  const targetQty = (existing?.quantity ?? 0) + requestedQty;
  const finalQty = Math.max(1, Math.min(cap, targetQty));

  if (existing) {
    const { error: updateError } = await admin
      .from('cart_items')
      .update({ quantity: finalQty })
      .eq('id', existing.id)
      .eq('user_id', auth.user.id);
    if (updateError) return serverError('Erro ao atualizar carrinho');
    return NextResponse.json({ id: existing.id, quantity: finalQty });
  }

  const { data: inserted, error: insertError } = await admin
    .from('cart_items')
    .insert({
      user_id: auth.user.id,
      product_id,
      product_option_id: optionId,
      quantity: finalQty,
      customization_text: normalizedCustomization || null,
    })
    .select('id, quantity')
    .single();

  if (insertError || !inserted) return serverError('Erro ao adicionar ao carrinho');
  const insertedRow = inserted as Pick<CartItem, 'id' | 'quantity'>;

  return NextResponse.json(
    { id: insertedRow.id, quantity: insertedRow.quantity },
    { status: 201 },
  );
}
