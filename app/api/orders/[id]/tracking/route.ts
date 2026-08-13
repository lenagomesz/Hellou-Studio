import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { notFound, requirePermission, requireUser } from '@/lib/api';
import { trackCorreiosShipment } from '@/lib/shipment-tracking';

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: RouteCtx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  if (auth.user.role === 'admin') {
    const permission = await requirePermission('orders.manage');
    if (permission.response) return permission.response;
  }

  const { id } = await ctx.params;
  let query = getSupabaseAdmin()
    .from('orders')
    .select('id, user_id, shipping_address')
    .eq('id', id);

  if (auth.user.role !== 'admin') query = query.eq('user_id', auth.user.id);

  const { data: order, error } = await query.maybeSingle();
  if (error || !order) return notFound('Pedido não encontrado');

  const shipping = order.shipping_address as Record<string, unknown> | null;
  const trackingCode = typeof shipping?.tracking_code === 'string' ? shipping.tracking_code.trim() : '';
  if (!trackingCode) return notFound('Este pedido ainda não possui código de rastreamento');

  const tracking = await trackCorreiosShipment(trackingCode);
  return NextResponse.json(tracking, {
    headers: { 'Cache-Control': 'private, no-store, must-revalidate' },
  });
}
