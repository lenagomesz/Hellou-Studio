import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { serverError } from '@/lib/api';

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

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
