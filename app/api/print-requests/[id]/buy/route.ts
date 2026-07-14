import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser, badRequest, notFound, serverError } from '@/lib/api';

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();

  const { data: pr, error: prErr } = await admin
    .from('print_requests')
    .select('*')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (prErr) return serverError('Erro ao buscar solicitação');
  if (!pr) return notFound('Solicitação não encontrada');
  if (pr.status !== 'approved') return badRequest('Solicitação não está aprovada');
  if (pr.quoted_price == null) return badRequest('Preço não definido');

  const price = Number(pr.quoted_price);
  let productId: string = pr.product_id;

  // Create product if it doesn't exist yet
  if (!productId) {
    const { data: product, error: productErr } = await admin
      .from('products')
      .insert({
        name: `Encomenda - ${pr.title}`,
        category: 'encomenda',
        base_price: price,
        image_url: null,
        active: true,
        description: `Encomenda personalizada - ${pr.title}`,
      })
      .select('id')
      .single();

    if (productErr || !product) {
      console.error('[buy] product creation error:', productErr);
      return serverError('Erro ao criar produto');
    }

    productId = product.id;

    // Link product to print request
    await admin
      .from('print_requests')
      .update({ product_id: productId })
      .eq('id', id);
  } else {
    // Ensure existing product is active
    const { data: existing } = await admin
      .from('products')
      .select('id, active')
      .eq('id', productId)
      .maybeSingle();

    if (!existing) {
      // Product was deleted, recreate
      const { data: product, error: productErr } = await admin
        .from('products')
        .insert({
          name: `Encomenda - ${pr.title}`,
          category: 'encomenda',
          base_price: price,
          image_url: null,
          active: true,
          description: `Encomenda personalizada - ${pr.title}`,
        })
        .select('id')
        .single();

      if (productErr || !product) return serverError('Erro ao recriar produto');
      productId = product.id;

      await admin
        .from('print_requests')
        .update({ product_id: productId })
        .eq('id', id);
    } else if (!existing.active) {
      await admin.from('products').update({ active: true }).eq('id', productId);
    }
  }

  // Check if already in cart
  const { data: cartItem } = await admin
    .from('cart_items')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (!cartItem) {
    const { error: cartErr } = await admin
      .from('cart_items')
      .insert({
        user_id: auth.user.id,
        product_id: productId,
        product_option_id: null,
        quantity: 1,
      });

    if (cartErr) {
      console.error('[buy] cart insert error:', cartErr);
      return serverError('Erro ao adicionar ao carrinho');
    }
  }

  // O status só muda para "paid" no webhook, depois da confirmação real do pagamento.
  return NextResponse.json({ success: true, product_id: productId });
}
