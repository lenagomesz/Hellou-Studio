import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { serverError } from '@/lib/api';

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const admin = getSupabaseAdmin();

  const { count, error } = await admin
    .from('product_views')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', id);

  if (error) return serverError('Erro ao buscar visualizações');

  return NextResponse.json({ views: count ?? 0 });
}
