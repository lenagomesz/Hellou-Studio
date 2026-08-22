import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission, badRequest, notFound, serverError } from '@/lib/api';
import { sendOrderLinkedEmail } from '@/lib/email';
import type { PrintRequest } from '@/types/database';

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const auth = await requirePermission('orders.status.manage');
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();

  const { data: printRequest, error: fetchError } = await admin
    .from('print_requests')
    .select('*, user:users(id, email, name)')
    .eq('id', id)
    .single();

  if (fetchError || !printRequest) return notFound('Encomenda não encontrada');

  const req = printRequest as PrintRequest & { user?: { id: string; email: string; name: string | null } };

  if (!req.quoted_price) {
    return badRequest('A encomenda deve ter um preço orçado antes de ser vinculada como pedido');
  }

  if (!req.user_id) {
    return badRequest('A encomenda deve estar vinculada a um usuário');
  }

  try {
    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        user_id: req.user_id,
        created_at: req.created_at,
        status: 'processing',
        total: req.quoted_price,
        shipping_address: null,
        payment_provider: 'manual',
        mp_status: null,
      })
      .select()
      .single();

    if (orderError) return serverError(orderError.message);

    if (req.product_id) {
      const { error: itemError } = await admin
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: req.product_id,
          quantity: 1,
          price: req.quoted_price,
        });

      if (itemError) return serverError(itemError.message);
    }

    const { error: updateError } = await admin
      .from('print_requests')
      .update({ status: 'in_production' })
      .eq('id', id);

    if (updateError) return serverError(updateError.message);

    if (req.user?.email) {
      await sendOrderLinkedEmail({
        email: req.user.email,
        nome: req.user.name,
        orderId: order.id,
        printRequestTitle: req.title,
      });
    }

    return NextResponse.json({
      success: true,
      order,
      message: 'Encomenda vinculada como pedido com sucesso',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return serverError(message);
  }
}
