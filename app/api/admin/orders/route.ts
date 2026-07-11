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
    return NextResponse.json({ received: true, status });
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
