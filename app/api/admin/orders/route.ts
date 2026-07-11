import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendOrderStatusEmail } from '@/lib/email';
import type { OrderStatus } from '@/types/database';

const VALID_STATUSES: OrderStatus[] = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'canceled', 'refunded'];

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const status = req.nextUrl.searchParams.get('status') ?? '';
  const search = req.nextUrl.searchParams.get('search') ?? '';
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10)));

  const admin = getSupabaseAdmin();

  // Build base query with filters
  let countQuery = admin
    .from('orders')
    .select('id', { count: 'exact', head: true });

  let dataQuery = admin
    .from('orders')
    .select('id, status, total, created_at, mp_status, user:users(id, email, name)')
    .order('created_at', { ascending: false });

  if (status && VALID_STATUSES.includes(status as OrderStatus)) {
    countQuery = countQuery.eq('status', status);
    dataQuery = dataQuery.eq('status', status);
  }

  // If searching, we need to fetch more rows and filter in-memory (Supabase doesn't support OR across relations easily)
  if (search) {
    const { data, error } = await dataQuery.limit(1000);
    if (error) return serverError('Erro ao buscar pedidos');

    let rows = (data ?? []) as unknown as { id: string; status: OrderStatus; total: number; created_at: string; mp_status?: string; user: { id: string; email: string; name: string | null } | null }[];

    const term = search.toLowerCase();
    rows = rows.filter((order) => {
      if (order.id.toLowerCase().includes(term)) return true;
      const email = order.user?.email?.toLowerCase() ?? '';
      const name = order.user?.name?.toLowerCase() ?? '';
      return email.includes(term) || name.includes(term);
    });

    const total = rows.length;
    const pages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedRows = rows.slice(start, start + limit);

    return NextResponse.json({
      orders: paginatedRows,
      pagination: { page, limit, total, pages },
    });
  }

  // No search: use database-level pagination
  const { count, error: countError } = await countQuery;
  if (countError) return serverError('Erro ao contar pedidos');

  const total = count ?? 0;
  const pages = Math.ceil(total / limit);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error } = await dataQuery.range(from, to);
  if (error) return serverError('Erro ao buscar pedidos');

  const rows = (data ?? []) as unknown as { id: string; status: OrderStatus; total: number; created_at: string; mp_status?: string; user: { id: string; email: string; name: string | null } | null }[];

  return NextResponse.json({
    orders: rows,
    pagination: { page, limit, total, pages },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = await request.json();
  const { orderId, status, trackingCode } = body;

  if (!orderId || !status) {
    return NextResponse.json({ error: 'orderId and status are required' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Fetch order
  const { data: order, error: fetchError } = await admin
    .from('orders')
    .select('id, user_id, status')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Idempotent: if status hasn't changed, return early
  if (order.status === status) {
    return NextResponse.json({ success: true, status, message: `Pedido atualizado para ${status}` });
  }

  // Update status
  const updatePayload: Record<string, unknown> = { status };
  if (status === 'shipped' && trackingCode) {
    updatePayload.tracking_code = trackingCode;
  }

  const { error: updateError } = await admin
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId);

  if (updateError) {
    return serverError('Erro ao atualizar pedido');
  }

  // Send email to customer
  try {
    const { data: userData } = await admin
      .from('users')
      .select('email, name')
      .eq('id', order.user_id)
      .single();

    if (userData?.email) {
      await sendOrderStatusEmail({
        email: userData.email,
        nome: userData.name || null,
        orderId,
        newStatus: status,
        trackingCode: trackingCode || null,
      });
    }
  } catch (err) {
    console.error('[admin-orders-patch] email error:', err);
    // Don't fail the request if email fails
  }

  return NextResponse.json({ success: true, status, message: `Pedido atualizado para ${status}` });
}
