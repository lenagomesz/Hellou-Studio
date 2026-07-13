import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser, badRequest, serverError } from '@/lib/api';

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  let body: { orderId?: string; rating?: number; comment?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest('Body inválido');
  }

  const { orderId, rating } = body;
  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 1200) : '';

  if (!orderId || typeof orderId !== 'string') {
    return badRequest('orderId é obrigatório');
  }

  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return badRequest('rating deve ser um inteiro entre 1 e 5');
  }

  const admin = getSupabaseAdmin();

  // Verify the order belongs to this user and is delivered
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .eq('user_id', auth.user.id)
    .single();

  if (orderError || !order) {
    return badRequest('Pedido não encontrado');
  }

  if (order.status !== 'delivered') {
    return badRequest('Só é possível avaliar pedidos entregues');
  }

  // Upsert rating
  const { error: upsertError } = await admin
    .from('order_ratings')
    .upsert(
      {
        order_id: orderId,
        user_id: auth.user.id,
        rating,
        comment: comment || null,
      },
      { onConflict: 'order_id' }
    );

  if (upsertError) {
    console.error('[ratings] upsert error:', {
      message: upsertError.message,
      code: upsertError.code,
      details: upsertError.details,
    });
    return serverError(`Erro ao salvar avaliação: ${upsertError.message}`);
  }

  return NextResponse.json({ success: true });
}
