import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  badRequest,
  notFound,
  requireUser,
  serverError,
} from '@/lib/api';
import type { CartItem, Product, ProductOption } from '@/types/database';

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  if (!id) return badRequest('id obrigatório');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const { quantity } = (body ?? {}) as { quantity?: number };
  if (
    typeof quantity !== 'number' ||
    !Number.isFinite(quantity) ||
    Math.floor(quantity) < 1
  ) {
    return badRequest('Quantidade inválida');
  }

  const admin = getSupabaseAdmin();

  const { data: existingRow, error: existingError } = await admin
    .from('cart_items')
    .select('id, user_id, product_id, product_option_id')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  const existing = existingRow as Pick<
    CartItem,
    'id' | 'user_id' | 'product_id' | 'product_option_id'
  > | null;
  if (existingError) return serverError('Erro ao buscar item');
  if (!existing) return notFound('Item não encontrado');

  const { data: productRow, error: productError } = await admin
    .from('products')
    .select('fulfillment_mode, is_wholesale, minimum_order_quantity')
    .eq('id', existing.product_id)
    .maybeSingle();
  if (productError) return serverError('Erro ao validar produto');
  const product = productRow as Pick<Product, 'fulfillment_mode' | 'is_wholesale' | 'minimum_order_quantity'> | null;
  const minimumQuantity = product?.is_wholesale ? Math.max(2, product.minimum_order_quantity ?? 2) : 1;
  if (Math.floor(quantity) < minimumQuantity) return badRequest(`O pedido mínimo deste produto é de ${minimumQuantity} unidades`);
  let cap = product?.is_wholesale ? 999 : 50;

  if (product?.fulfillment_mode === 'ready_stock' && existing.product_option_id) {
    const { data: optionRow, error: optionError } = await admin
      .from('product_options')
      .select('stock')
      .eq('id', existing.product_option_id)
      .maybeSingle();
    if (optionError) return serverError('Erro ao validar variação');
    const option = optionRow as Pick<ProductOption, 'stock'> | null;
    if (option) cap = Math.min(option.stock, cap);
  }

  if (cap < minimumQuantity) return badRequest('Estoque insuficiente para o pedido mínimo deste produto');

  const finalQty = Math.max(minimumQuantity, Math.min(cap, Math.floor(quantity)));

  const { error: updateError } = await admin
    .from('cart_items')
    .update({ quantity: finalQty })
    .eq('id', id)
    .eq('user_id', auth.user.id);

  if (updateError) return serverError('Erro ao atualizar item');

  return NextResponse.json({ id, quantity: finalQty });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  if (!id) return badRequest('id obrigatório');

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('cart_items')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user.id);

  if (error) return serverError('Erro ao remover item');
  return NextResponse.json({ ok: true });
}
