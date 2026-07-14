import { NextResponse, type NextRequest } from 'next/server';
import { badRequest, requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('reviews.manage');
  if (auth.response) return auth.response;

  const params = req.nextUrl.searchParams;
  const limit = Number(params.get('limit') ?? 20);
  const offset = Number(params.get('offset') ?? 0);
  const minRating = Number(params.get('minRating') ?? 1);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return badRequest('Limite inválido');
  if (!Number.isInteger(offset) || offset < 0) return badRequest('Deslocamento inválido');
  if (!Number.isInteger(minRating) || minRating < 1 || minRating > 5) return badRequest('Nota mínima inválida');

  const admin = getSupabaseAdmin();
  const { count, error: countError } = await admin
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .gte('rating', minRating);

  if (countError) {
    console.error('[admin/reviews] count error:', countError);
    return serverError('Erro ao contar avaliações de produtos');
  }

  const { data, error } = await admin
    .from('reviews')
    .select('id, user_id, product_id, rating, comment, created_at, user:users(name, email), product:products(name, type)')
    .gte('rating', minRating)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[admin/reviews] fetch error:', error);
    return serverError('Erro ao buscar avaliações de produtos');
  }

  const rows = (data ?? []).map((row) => {
    const user = row.user as unknown as { name: string | null; email: string } | null;
    const product = row.product as unknown as { name: string; type: 'physical' | 'digital' } | null;
    return {
      id: row.id,
      userId: row.user_id,
      productId: row.product_id,
      rating: row.rating,
      comment: row.comment ?? null,
      createdAt: row.created_at,
      userName: user?.name ?? null,
      userEmail: user?.email ?? null,
      productName: product?.name ?? 'Produto indisponível',
      productType: product?.type ?? 'physical',
    };
  });

  return NextResponse.json({ data: rows, count: count ?? 0, limit, offset });
}
