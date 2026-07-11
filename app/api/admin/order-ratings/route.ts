import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin, badRequest, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const params = req.nextUrl.searchParams;

  // Parse and validate limit
  const limitParam = params.get('limit');
  let limit = 50;
  if (limitParam !== null) {
    limit = Number(limitParam);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return badRequest('limit deve ser um inteiro entre 1 e 100');
    }
  }

  // Parse and validate offset
  const offsetParam = params.get('offset');
  let offset = 0;
  if (offsetParam !== null) {
    offset = Number(offsetParam);
    if (!Number.isInteger(offset) || offset < 0) {
      return badRequest('offset deve ser um inteiro >= 0');
    }
  }

  // Parse and validate minRating
  const minRatingParam = params.get('minRating');
  let minRating = 1;
  if (minRatingParam !== null) {
    minRating = Number(minRatingParam);
    if (!Number.isInteger(minRating) || minRating < 1 || minRating > 5) {
      return badRequest('minRating deve ser um inteiro entre 1 e 5');
    }
  }

  const admin = getSupabaseAdmin();

  // Get total count with filter
  const { count, error: countError } = await admin
    .from('order_ratings')
    .select('*', { count: 'exact', head: true })
    .gte('rating', minRating);

  if (countError) {
    console.error('[admin/order-ratings] count error:', countError);
    return serverError('Erro ao contar avaliações');
  }

  // Fetch ratings with joins to users and orders
  const { data, error } = await admin
    .from('order_ratings')
    .select('id, order_id, user_id, rating, created_at, user:users(name, email), order:orders(total)')
    .gte('rating', minRating)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[admin/order-ratings] fetch error:', error);
    return serverError('Erro ao buscar avaliações');
  }

  const rows = (data ?? []).map((row) => {
    const user = row.user as unknown as { name: string | null; email: string } | null;
    const order = row.order as unknown as { total: number } | null;
    return {
      id: row.id,
      orderId: row.order_id,
      userId: row.user_id,
      rating: row.rating,
      createdAt: row.created_at,
      userName: user?.name ?? null,
      userEmail: user?.email ?? null,
      orderTotal: order?.total ?? null,
    };
  });

  return NextResponse.json({
    data: rows,
    count: count ?? 0,
    limit,
    offset,
  });
}
