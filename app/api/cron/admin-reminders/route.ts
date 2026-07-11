import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/api';

export async function POST() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();
  let createdCount = 0;
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Helper: check if a duplicate notification already exists (same type + related entity within last 24h)
  async function isDuplicate(
    type: string,
    relatedOrderId?: string,
    relatedProductOptionId?: string,
  ): Promise<boolean> {
    let query = admin
      .from('admin_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('type', type)
      .gte('created_at', twentyFourHoursAgo);

    if (relatedOrderId) {
      query = query.eq('related_order_id', relatedOrderId);
    }
    if (relatedProductOptionId) {
      query = query.eq('related_product_option_id', relatedProductOptionId);
    }

    const { count } = await query;
    return (count ?? 0) > 0;
  }

  // 1. Orders with status='paid' created >24h ago that haven't moved to 'processing'
  {
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { data: orders } = await admin
      .from('orders')
      .select('id')
      .eq('status', 'paid')
      .lt('created_at', cutoff);

    if (orders) {
      for (const order of orders) {
        const shortId = order.id.slice(0, 8).toUpperCase();
        const duplicate = await isDuplicate('production_reminder', order.id);
        if (!duplicate) {
          const { error } = await admin.from('admin_notifications').insert({
            type: 'production_reminder',
            title: `Pedido #${shortId} aguardando produção`,
            priority: 'high',
            related_order_id: order.id,
          });
          if (!error) createdCount++;
        }
      }
    }
  }

  // 2. Orders with status='processing' created >3 days ago
  {
    const cutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: orders } = await admin
      .from('orders')
      .select('id')
      .eq('status', 'processing')
      .lt('created_at', cutoff);

    if (orders) {
      for (const order of orders) {
        const shortId = order.id.slice(0, 8).toUpperCase();
        const duplicate = await isDuplicate('order_overdue', order.id);
        if (!duplicate) {
          const { error } = await admin.from('admin_notifications').insert({
            type: 'order_overdue',
            title: `Pedido #${shortId} pode estar atrasado`,
            priority: 'urgent',
            related_order_id: order.id,
          });
          if (!error) createdCount++;
        }
      }
    }
  }

  // 3. Orders with status='completed' created >1 day ago that haven't moved to 'shipped'
  {
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { data: orders } = await admin
      .from('orders')
      .select('id')
      .eq('status', 'completed')
      .lt('created_at', cutoff);

    if (orders) {
      for (const order of orders) {
        const shortId = order.id.slice(0, 8).toUpperCase();
        const duplicate = await isDuplicate('shipping_reminder', order.id);
        if (!duplicate) {
          const { error } = await admin.from('admin_notifications').insert({
            type: 'shipping_reminder',
            title: `Enviar pedido #${shortId}!`,
            priority: 'urgent',
            related_order_id: order.id,
          });
          if (!error) createdCount++;
        }
      }
    }
  }

  // 4. Product options with stock <= 3
  {
    const { data: options } = await admin
      .from('product_options')
      .select('id, color, product_id, products(name)')
      .lte('stock', 3);

    if (options) {
      for (const option of options) {
        const productName =
          (option as any).products?.name ?? 'Produto';
        const duplicate = await isDuplicate('low_stock', undefined, option.id);
        if (!duplicate) {
          const { error } = await admin.from('admin_notifications').insert({
            type: 'low_stock',
            title: `Estoque baixo: ${productName} - ${option.color}`,
            priority: 'high',
            related_product_id: option.product_id,
            related_product_option_id: option.id,
          });
          if (!error) createdCount++;
        }
      }
    }
  }

  // 5. Print requests with status='pending' created >2 days ago
  {
    const cutoff = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const { data: requests } = await admin
      .from('print_requests')
      .select('id')
      .eq('status', 'pending')
      .lt('created_at', cutoff);

    if (requests) {
      for (const req of requests) {
        const shortId = req.id.slice(0, 8).toUpperCase();
        // Use related_order_id field for print request dedup (no dedicated field)
        const duplicate = await isDuplicate('new_print_request', req.id);
        if (!duplicate) {
          const { error } = await admin.from('admin_notifications').insert({
            type: 'new_print_request',
            title: `Solicitação #${shortId} aguardando análise`,
            priority: 'normal',
            related_order_id: req.id,
          });
          if (!error) createdCount++;
        }
      }
    }
  }

  return NextResponse.json({ success: true, created_count: createdCount });
}
