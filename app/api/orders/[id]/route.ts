import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin, badRequest, notFound, serverError } from '@/lib/api';
import { sendOrderStatusEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';
import type { OrderStatus } from '@/types/database';

const VALID_STATUSES: OrderStatus[] = [
  'pending', 'paid', 'processing', 'shipped', 'delivered', 'canceled', 'refunded',
];

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();

  const { data: order, error } = await admin
    .from('orders')
    .select('*, user:users(id, email, name), items:order_items(*, product:products(id, name, image_url))')
    .eq('id', id)
    .single();

  if (error || !order) return notFound('Pedido não encontrado');

  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  const body = await req.json();
  const { status, tracking_code, admin_notes } = body as {
    status?: string;
    tracking_code?: string;
    admin_notes?: string;
  };

  if (status && !VALID_STATUSES.includes(status as OrderStatus)) {
    return badRequest('Status inválido');
  }

  if (status === 'shipped' && !tracking_code?.trim()) {
    return badRequest('Código de rastreio é obrigatório para envio');
  }

  const admin = getSupabaseAdmin();

  const { data: current } = await admin.from('orders').select('shipping_address').eq('id', id).single();
  if (!current) return notFound('Pedido não encontrado');

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;

  const shippingData = (current.shipping_address ?? {}) as Record<string, unknown>;
  if (tracking_code !== undefined) {
    shippingData.tracking_code = tracking_code;
    updates.shipping_address = shippingData;
  }
  if (admin_notes !== undefined) {
    shippingData.admin_notes = admin_notes;
    updates.shipping_address = shippingData;
  }

  const { error } = await admin.from('orders').update(updates).eq('id', id);
  if (error) return serverError('Erro ao atualizar pedido');

  // Send email to user when status changes
  if (status) {
    const { data: order } = await admin
      .from('orders')
      .select('user_id, shipping_address')
      .eq('id', id)
      .single();

    if (order) {
      const { data: user } = await admin
        .from('users')
        .select('email, name')
        .eq('id', order.user_id)
        .single();

      if (user?.email) {
        const shipping = order.shipping_address as Record<string, unknown> | null;
        sendOrderStatusEmail({
          email: user.email,
          nome: user.name ?? null,
          orderId: id,
          newStatus: status,
          trackingCode: (shipping?.tracking_code as string) ?? null,
        }).catch(() => {});
      }

      const statusLabels: Record<string, string> = {
        paid: 'Pagamento confirmado',
        processing: 'Em preparo',
        shipped: 'Enviado',
        delivered: 'Entregue',
        canceled: 'Cancelado',
        refunded: 'Reembolsado',
      };

      const label = statusLabels[status] ?? status;
      createNotification(
        order.user_id,
        'order_status',
        `Pedido #${id.slice(0, 8).toUpperCase()} — ${label}`,
        null,
        { order_id: id, status },
      ).catch(() => {});
    }
  }

  return NextResponse.json({ success: true });
}
