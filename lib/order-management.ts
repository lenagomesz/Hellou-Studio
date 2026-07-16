// lib/order-management.ts
// Core utilities for bulk order management system

import { getSupabaseAdmin } from '@/lib/supabase';
import { sendOrderStatusEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';
import { getStoreDayBounds } from '@/lib/store-time';
import type { OrderStatus } from '@/types/database';

const STATUS_LABELS: Record<string, string> = {
  awaiting_payment: 'Aguardando Pagamento',
  pending: 'Pendente',
  approved: 'Aprovado',
  paid: 'Pago',
  processing: 'Em preparo',
  completed: 'Concluido',
  shipped: 'Enviado',
  delivered: 'Entregue',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
};

export interface BulkActionResult {
  orderId: string;
  success: boolean;
  error?: string;
  emailSent?: boolean;
}

export interface TimelineEvent {
  id: string;
  order_id: string;
  status: string;
  previous_status: string | null;
  changed_by: string | null;
  changed_by_name: string | null;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OrderNote {
  id: string;
  order_id: string;
  author_id: string;
  author_name: string | null;
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceData {
  id: string;
  order_id: string;
  invoice_number: number;
  customer_name: string | null;
  customer_email: string | null;
  items: Array<{ name: string; quantity: number; unit_price: number; total: number }>;
  subtotal: number;
  shipping_cost: number;
  total: number;
  status: string;
  sent_at: string | null;
  created_at: string;
}

// Create timeline event for an order
export async function createTimelineEvent(params: {
  orderId: string;
  status: string;
  previousStatus?: string | null;
  changedBy?: string | null;
  changedByName?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('order_timeline').insert({
    order_id: params.orderId,
    status: params.status,
    previous_status: params.previousStatus ?? null,
    changed_by: params.changedBy ?? null,
    changed_by_name: params.changedByName ?? null,
    message: params.message ?? null,
    metadata: params.metadata ?? {},
  });
  if (error) {
    console.error('[order-management] timeline event error:', error);
  }
}

// Log a notification (email/SMS sent)
export async function logNotification(params: {
  orderId?: string | null;
  userId?: string | null;
  type: 'email' | 'sms' | 'slack';
  template?: string;
  recipient: string;
  subject?: string;
  status?: 'sent' | 'failed' | 'pending';
  metadata?: Record<string, unknown>;
}) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('notification_logs').insert({
    order_id: params.orderId ?? null,
    user_id: params.userId ?? null,
    type: params.type,
    template: params.template ?? null,
    recipient: params.recipient,
    subject: params.subject ?? null,
    status: params.status ?? 'sent',
    metadata: params.metadata ?? {},
  });
  if (error) {
    console.error('[order-management] notification log error:', error);
  }
}

// Bulk update order statuses
export async function bulkUpdateStatus(params: {
  orderIds: string[];
  newStatus: OrderStatus;
  trackingCode?: string;
  adminId: string;
  adminName: string;
  sendEmails?: boolean;
}): Promise<BulkActionResult[]> {
  const admin = getSupabaseAdmin();
  const results: BulkActionResult[] = [];

  for (const orderId of params.orderIds) {
    try {
      // Get current order data
      const { data: order, error: fetchError } = await admin
        .from('orders')
        .select('id, status, user_id, shipping_address')
        .eq('id', orderId)
        .single();

      if (fetchError || !order) {
        results.push({ orderId, success: false, error: 'Pedido nao encontrado' });
        continue;
      }

      // Skip if already in the target status
      if (order.status === params.newStatus) {
        results.push({ orderId, success: true, emailSent: false });
        continue;
      }

      const previousStatus = order.status;

      // Build update payload
      const updates: Record<string, unknown> = {
        status: params.newStatus,
        updated_at: new Date().toISOString(),
      };

      if (params.newStatus === 'shipped' && params.trackingCode) {
        const shippingData = (order.shipping_address ?? {}) as Record<string, unknown>;
        shippingData.tracking_code = params.trackingCode;
        updates.shipping_address = shippingData;
      }

      // Update order
      const { error: updateError } = await admin
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (updateError) {
        results.push({ orderId, success: false, error: 'Erro ao atualizar' });
        continue;
      }

      // Create timeline event
      await createTimelineEvent({
        orderId,
        status: params.newStatus,
        previousStatus,
        changedBy: params.adminId,
        changedByName: params.adminName,
        message: `Status alterado em lote: ${STATUS_LABELS[previousStatus] ?? previousStatus} → ${STATUS_LABELS[params.newStatus] ?? params.newStatus}`,
        metadata: { bulk: true },
      });

      // Send email if requested
      let emailSent = false;
      if (params.sendEmails) {
        try {
          const { data: user } = await admin
            .from('users')
            .select('email, name')
            .eq('id', order.user_id)
            .single();

          if (user?.email) {
            await sendOrderStatusEmail({
              email: user.email,
              nome: user.name ?? null,
              orderId,
              newStatus: params.newStatus,
              trackingCode: params.trackingCode ?? null,
            });
            emailSent = true;

            await logNotification({
              orderId,
              userId: order.user_id,
              type: 'email',
              template: 'order_status_change',
              recipient: user.email,
              subject: `Status do pedido atualizado para ${STATUS_LABELS[params.newStatus]}`,
              status: 'sent',
            });

            // Create in-app notification
            const label = STATUS_LABELS[params.newStatus] ?? params.newStatus;
            await createNotification(
              order.user_id,
              'order_status',
              `Pedido #${orderId.slice(0, 8).toUpperCase()} — ${label}`,
              null,
              { order_id: orderId, status: params.newStatus },
            );
          }
        } catch (emailErr) {
          console.error('[bulk-update] email error for order:', orderId, emailErr);
        }
      }

      results.push({ orderId, success: true, emailSent });
    } catch (_err) {
      results.push({ orderId, success: false, error: 'Erro interno' });
    }
  }

  return results;
}

// Bulk add internal notes
export async function bulkAddNote(params: {
  orderIds: string[];
  content: string;
  authorId: string;
  authorName: string;
}): Promise<BulkActionResult[]> {
  const admin = getSupabaseAdmin();
  const results: BulkActionResult[] = [];

  const rows = params.orderIds.map(orderId => ({
    order_id: orderId,
    author_id: params.authorId,
    author_name: params.authorName,
    content: params.content,
    is_internal: true,
  }));

  const { error } = await admin.from('order_notes').insert(rows);

  if (error) {
    return params.orderIds.map(orderId => ({
      orderId,
      success: false,
      error: 'Erro ao criar nota',
    }));
  }

  // Create timeline events
  for (const orderId of params.orderIds) {
    await createTimelineEvent({
      orderId,
      status: 'note_added',
      changedBy: params.authorId,
      changedByName: params.authorName,
      message: `Nota interna adicionada: "${params.content.slice(0, 100)}"`,
      metadata: { type: 'note' },
    });
    results.push({ orderId, success: true });
  }

  return results;
}

// Generate invoice for an order
export async function generateInvoice(params: {
  orderId: string;
  adminId: string;
  adminName: string;
}): Promise<InvoiceData | null> {
  const admin = getSupabaseAdmin();

  // Get order with items
  const { data: order, error: fetchError } = await admin
    .from('orders')
    .select('*, user:users(id, email, name), items:order_items(*, product:products(id, name))')
    .eq('id', params.orderId)
    .single();

  if (fetchError || !order) return null;

  const items = ((order.items as unknown) as Array<{ quantity: number; unit_price: number; product: { name: string } | null }>).map(item => ({
    name: item.product?.name ?? 'Produto',
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: item.quantity * item.unit_price,
  }));

  const subtotal = items.reduce((acc, i) => acc + i.total, 0);
  const shippingCost = order.total - subtotal > 0 ? order.total - subtotal : 0;

  const user = order.user as { id: string; email: string; name: string | null } | null;

  const { data: invoice, error: insertError } = await admin
    .from('invoices')
    .insert({
      order_id: params.orderId,
      customer_name: user?.name ?? null,
      customer_email: user?.email ?? null,
      items,
      subtotal,
      shipping_cost: shippingCost,
      total: order.total,
      status: 'generated',
    })
    .select()
    .single();

  if (insertError || !invoice) {
    console.error('[invoice] generation error:', insertError);
    return null;
  }

  // Timeline event
  await createTimelineEvent({
    orderId: params.orderId,
    status: 'invoice_generated',
    changedBy: params.adminId,
    changedByName: params.adminName,
    message: `Invoice #${invoice.invoice_number} gerada`,
    metadata: { invoice_id: invoice.id, invoice_number: invoice.invoice_number },
  });

  return invoice as InvoiceData;
}

// Process refund for an order
export async function processRefund(params: {
  orderId: string;
  amount: number;
  reason: string;
  adminId: string;
  adminName: string;
}): Promise<{ success: boolean; error?: string }> {
  const admin = getSupabaseAdmin();

  // Get order
  const { data: order, error: fetchError } = await admin
    .from('orders')
    .select('id, status, total, user_id, payment_provider, mp_payment_id')
    .eq('id', params.orderId)
    .single();

  if (fetchError || !order) {
    return { success: false, error: 'Pedido nao encontrado' };
  }

  if (order.status === 'refunded') {
    return { success: false, error: 'Pedido ja foi reembolsado' };
  }

  const orderTotal = Number(order.total);
  if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
    return { success: false, error: 'O pedido não possui um valor válido para reembolso' };
  }

  // O cliente do Mercado Pago abaixo executa reembolso integral. Impedimos que
  // um valor parcial seja apenas registrado no painel enquanto o provedor devolve o total.
  if (params.amount > 0 && Math.abs(params.amount - orderTotal) > 0.01) {
    return { success: false, error: 'Reembolso parcial não é suportado por este fluxo' };
  }
  const refundAmount = orderTotal;

  // For MercadoPago, attempt real refund
  if (order.payment_provider === 'mercadopago' && order.mp_payment_id) {
    try {
      const { getRefundClient } = await import('@/lib/mercadopago');
      const refundClient = getRefundClient();
      await refundClient.create({ payment_id: Number(order.mp_payment_id), body: {} });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      return { success: false, error: `Falha no MercadoPago: ${msg}` };
    }
  }

  // Update order status to refunded
  const { error: updateError } = await admin
    .from('orders')
    .update({ status: 'refunded', updated_at: new Date().toISOString() })
    .eq('id', params.orderId);

  if (updateError) {
    return { success: false, error: 'Erro ao atualizar status' };
  }

  // Log the refund
  await admin.from('refund_logs').insert({
    order_id: params.orderId,
    amount: refundAmount,
    reason: params.reason,
    refunded_by: params.adminId,
    refunded_by_name: params.adminName,
    payment_provider: order.payment_provider,
    status: 'processed',
  });

  // Timeline event
  await createTimelineEvent({
    orderId: params.orderId,
    status: 'refunded',
    previousStatus: order.status,
    changedBy: params.adminId,
    changedByName: params.adminName,
    message: `Reembolso de R$ ${refundAmount.toFixed(2)} processado. Motivo: ${params.reason}`,
    metadata: { amount: refundAmount, reason: params.reason },
  });

  // Send email to customer
  try {
    const { data: user } = await admin
      .from('users')
      .select('email, name')
      .eq('id', order.user_id)
      .single();

    if (user?.email) {
      await sendOrderStatusEmail({
        email: user.email,
        nome: user.name ?? null,
        orderId: params.orderId,
        newStatus: 'refunded',
        refundAmount,
        refundReason: params.reason,
      });

      await logNotification({
        orderId: params.orderId,
        userId: order.user_id,
        type: 'email',
        template: 'refund_processed',
        recipient: user.email,
        subject: 'Reembolso processado',
        status: 'sent',
      });

      // Create in-app notification for refund
      const { createNotification } = await import('@/lib/notifications');
      await createNotification(
        order.user_id,
        'order_status',
        `Pedido #${params.orderId.slice(0, 8).toUpperCase()} — Reembolsado`,
        `Seu reembolso de R$ ${refundAmount.toFixed(2)} foi processado. Motivo: ${params.reason}`,
        { order_id: params.orderId, status: 'refunded' },
      );
    }
  } catch (err) {
    console.error('[refund] email error:', err);
  }

  return { success: true };
}

// Get order quick stats
export async function getOrderQuickStats() {
  const admin = getSupabaseAdmin();
  const { start: todayStart, endExclusive: tomorrowStart } = getStoreDayBounds();

  // Today's orders
  const { count: todayCount } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString())
    .lt('created_at', tomorrowStart.toISOString());

  // By status counts
  const { count: processingCount } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'processing');

  const { count: shippedCount } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'shipped');

  const { count: paidCount } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'paid');

  const { count: deliveredCount } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'delivered');

  // Overdue orders (processing for > 3 days or shipped for > 7 days)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: overdueProcessing } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'processing')
    .lt('updated_at', threeDaysAgo);

  const { count: overdueShipped } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'shipped')
    .lt('updated_at', sevenDaysAgo);

  // Today's revenue
  const { data: todayOrders } = await admin
    .from('orders')
    .select('total')
    .gte('created_at', todayStart.toISOString())
    .lt('created_at', tomorrowStart.toISOString())
    .not('status', 'in', '("canceled","refunded")');

  const todayRevenue = (todayOrders ?? []).reduce((acc: number, o: { total: number }) => acc + o.total, 0);

  return {
    today: todayCount ?? 0,
    processing: processingCount ?? 0,
    shipped: shippedCount ?? 0,
    paid: paidCount ?? 0,
    delivered: deliveredCount ?? 0,
    overdue: (overdueProcessing ?? 0) + (overdueShipped ?? 0),
    todayRevenue,
  };
}
