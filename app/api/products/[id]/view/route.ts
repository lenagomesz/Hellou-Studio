import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { serverError } from '@/lib/api';
import { durableRateLimit } from '@/lib/durable-rate-limit';

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const limit = await durableRateLimit(request, `product-view:${id}`, { maxRequests: 30, windowMs: 60_000 });
  if (!limit.success) {
    return NextResponse.json({ error: 'Limite de visualizações atingido.' }, { status: 429 });
  }

  const admin = getSupabaseAdmin();

  // Insert new view record
  const { error: insertError } = await admin
    .from('product_views')
    .insert({ product_id: id });

  if (insertError) return serverError('Erro ao registrar visualização');

  // Return total count
  const { count, error: countError } = await admin
    .from('product_views')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', id);

  if (countError) return serverError('Erro ao contar visualizações');

  return NextResponse.json({ views: count ?? 0 });
}
