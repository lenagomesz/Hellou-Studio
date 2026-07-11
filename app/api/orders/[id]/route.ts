import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin, requireUser, badRequest, notFound, serverError } from '@/lib/api';
import { sendOrderStatusEmail, sendSTLDeliveryEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';
import { getRefundClient } from '@/lib/mercadopago';
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
    .select('*, user:users(id, email, name), items:order_items(*, product:products(id, name, image_url, type, file_path))')
    .eq('id', id)
    .single();

  if (error || !order) return notFound('Pedido não encontrado');

  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  const body = await req.json();
  const { status, tracking_code, admin_notes } = body as {
    status?: string;
    tracking_code?: string;
    admin_notes?: string;
  };

  if (!status) {
    return NextResponse.json({ error: 'Status is required' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // --- Customer flow: only allow digital-only order self-delivery ---
  if (auth.user.role !== 'admin') {
    // Verify order ownership
    const { data: order, error: fetchError } = await admin
      .from('orders')
      .select('id, user_id, status, items:order_items(*, product:products(type))')
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if digital-only
    const items = order.items as Array<{ product?: { type?: string } }>;
    const isDigitalOnly = items?.length > 0 && items.every((i) => i.product?.type === 'digital');

    // Only allow 'delivered' status for digital-only orders
    if (!isDigitalOnly || status !== 'delivered') {
      return NextResponse.json(
        { error: 'Invalid request: only digital orders can be marked as delivered' },
        { status: 400 }
      );
    }

    // If already delivered, return success (idempotent)
    if (order.status === 'delivered') {
      return NextResponse.json({ success: true, status: order.status, message: 'Status atualizado' });
    }

    // Update status
    const { error: updateError } = await admin
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (updateError) {
      return serverError('Erro ao atualizar pedido');
    }

    // Send STL delivery email
    try {
      const { data: userData } = await admin
        .from('users')
        .select('email, name')
        .eq('id', order.user_id)
        .single();

      if (userData?.email) {
        const fileName = (order.items?.[0] as any)?.product_snapshot?.name || 'Arquivo STL';
        await sendSTLDeliveryEmail({
          email: userData.email,
          nome: userData.name || null,
          orderId: id,
          fileName,
        });
      }
    } catch (err) {
      console.error('[order-patch] email error:', err);
    }

    return NextResponse.json({ success: true, status, message: 'Status atualizado' });
  }

  // --- Admin flow (unchanged) ---
  if (status && !VALID_STATUSES.includes(status as OrderStatus)) {
    return badRequest('Status inválido');
  }

  if (status === 'shipped' && !tracking_code?.trim()) {
    return badRequest('Código de rastreio é obrigatório para envio');
  }

  const { data: current } = await admin.from('orders').select('shipping_address, mp_payment_id, payment_provider').eq('id', id).single();
  if (!current) return notFound('Pedido não encontrado');

  if (status === 'refunded' && current.payment_provider === 'mercadopago' && current.mp_payment_id) {
    try {
      const refundClient = getRefundClient();
      await refundClient.create({ payment_id: Number(current.mp_payment_id), body: {} });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      return NextResponse.json({ error: `Falha ao reembolsar no Mercado Pago: ${msg}` }, { status: 400 });
    }
  }

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
