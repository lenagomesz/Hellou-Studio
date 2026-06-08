import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { OrderStatus } from '@/types/database';

const VALID_STATUSES: OrderStatus[] = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'canceled', 'refunded'];

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const status = req.nextUrl.searchParams.get('status') ?? '';
  const search = req.nextUrl.searchParams.get('search') ?? '';

  const admin = getSupabaseAdmin();
  let query = admin
    .from('orders')
    .select('id, status, total, created_at, user:users(id, email, name)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (status && VALID_STATUSES.includes(status as OrderStatus)) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return serverError('Erro ao buscar pedidos');

  let rows = (data ?? []) as unknown as { id: string; status: OrderStatus; total: number; created_at: string; user: { id: string; email: string; name: string | null } | null }[];

  if (search) {
    const term = search.toLowerCase();
    rows = rows.filter((order) => {
      if (order.id.toLowerCase().includes(term)) return true;
      const email = order.user?.email?.toLowerCase() ?? '';
      const name = order.user?.name?.toLowerCase() ?? '';
      return email.includes(term) || name.includes(term);
    });
  }

  return NextResponse.json(rows);
}
