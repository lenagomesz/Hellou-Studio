import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getCurrentUser, requireUser, badRequest, serverError } from '@/lib/api';

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from('reviews')
    .select('*, user:users(id, name)')
    .eq('product_id', id)
    .order('created_at', { ascending: false });

  if (error) return serverError('Erro ao buscar avaliações');

  let hasPurchased = false;
  const user = await getCurrentUser();
  if (user) {
    const { data: orderItem } = await admin
      .from('order_items')
      .select('id, order:orders!inner(user_id, status)')
      .eq('product_id', id)
      .eq('order.user_id', user.id)
      .limit(1)
      .maybeSingle();

    hasPurchased = !!orderItem;
  }

  return NextResponse.json({ reviews: data ?? [], has_purchased: hasPurchased });
}

export async function POST(req: Request, ctx: RouteCtx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const { rating, comment } = (body ?? {}) as { rating?: number; comment?: string };

  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return badRequest('Nota deve ser um número inteiro de 1 a 5');
  }

  const admin = getSupabaseAdmin();

  // Check if user purchased this product
  const { data: orderItem } = await admin
    .from('order_items')
    .select('id, order:orders!inner(user_id, status)')
    .eq('product_id', id)
    .eq('order.user_id', auth.user.id)
    .limit(1)
    .maybeSingle();

  if (!orderItem) {
    return badRequest('Você precisa comprar este produto antes de avaliar');
  }

  const { data: existing } = await admin
    .from('reviews')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('product_id', id)
    .maybeSingle();

  if (existing) {
    return badRequest('Você já avaliou este produto');
  }

  const { data, error } = await admin
    .from('reviews')
    .insert({
      user_id: auth.user.id,
      product_id: id,
      rating,
      comment: comment?.trim() || null,
    })
    .select('*, user:users(id, name)')
    .single();

  if (error) return serverError('Erro ao salvar avaliação');

  return NextResponse.json({ review: data }, { status: 201 });
}
