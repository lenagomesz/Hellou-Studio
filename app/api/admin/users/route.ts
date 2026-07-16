import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission, serverError } from '@/lib/api';
import { sanitizeSearchInput } from '@/lib/security';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('customers.view');
  if (auth.response) return auth.response;

  const rawSearch = req.nextUrl.searchParams.get('search') ?? '';
  const search = sanitizeSearchInput(rawSearch);
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 25));
  const admin = getSupabaseAdmin();

  let query = admin
    .from('users')
    .select('id, email, name, role, is_vip, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search.trim()) {
    query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
  }

  const from = (page - 1) * limit;
  const { data, count, error } = await query.range(from, from + limit - 1);
  if (error) return serverError('Erro ao buscar usuários');

  const userIds = (data ?? []).map((user) => user.id);
  const { data: orders } = userIds.length > 0
    ? await admin.from('orders').select('user_id, total, status, created_at').in('user_id', userIds)
    : { data: [] };
  const metrics = new Map<string, { total_orders: number; total_spent: number; last_order_at: string | null }>();
  for (const order of orders ?? []) {
    if (order.status === 'canceled' || order.status === 'refunded') continue;
    const current = metrics.get(order.user_id) ?? { total_orders: 0, total_spent: 0, last_order_at: null };
    current.total_orders += 1;
    current.total_spent += Number(order.total);
    if (!current.last_order_at || new Date(order.created_at) > new Date(current.last_order_at)) current.last_order_at = order.created_at;
    metrics.set(order.user_id, current);
  }

  return NextResponse.json({
    users: (data ?? []).map((user) => ({ ...user, ...(metrics.get(user.id) ?? { total_orders: 0, total_spent: 0, last_order_at: null }) })),
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}
