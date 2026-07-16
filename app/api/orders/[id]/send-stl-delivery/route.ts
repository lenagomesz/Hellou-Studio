import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission, notFound } from '@/lib/api';
import { sendSTLDeliveryEmail, sendOrderStatusEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

type RouteCtx = { params: Promise<{ id: string }> };

interface OrderItemWithProduct {
  product?: {
    id: string;
    name: string;
    type: string;
  } | null;
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const auth = await requirePermission('orders.status.manage');
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();

  // Get order with items and user
  const { data: order, error } = await admin
    .from('orders')
    .select('*, user:users(id, email, name), items:order_items(*, product:products(id, name, type))')
    .eq('id', id)
    .single();

  if (error || !order) return notFound('Pedido não encontrado');

  // Check if order has STL items
  const stlItems = (order.items as OrderItemWithProduct[]).filter(
    (item) => item.product?.type === 'digital',
  );
  if (!stlItems.length) {
    return NextResponse.json({ error: 'Este pedido não contém arquivos STL' }, { status: 400 });
  }

  // Send emails for each STL item
  for (const item of stlItems) {
    if (item.product?.name) {
      await sendSTLDeliveryEmail({
        email: order.user?.email || '',
        nome: order.user?.name || null,
        orderId: id,
        fileName: item.product.name,
      });
    }
  }

  // Update order status to delivered if it's not already
  if (order.status !== 'delivered') {
    await admin.from('orders').update({ status: 'delivered' }).eq('id', id);
  }

  // Create notification
  try {
    await createNotification(
      order.user?.id,
      'order_status',
      'Seu arquivo está pronto! ✨',
      `Acesse seu pedido #${id.slice(0, 8).toUpperCase()} para baixar os arquivos STL.`,
      { order_id: id, event: 'stl_delivered_manual' },
    );
  } catch (e) {
    console.error('[stl-delivery] notification error:', e);
  }

  // Send status email
  try {
    await sendOrderStatusEmail({
      email: order.user?.email || '',
      nome: order.user?.name || null,
      orderId: id,
      newStatus: 'delivered',
    });
  } catch (e) {
    console.error('[stl-delivery] status email error:', e);
  }

  return NextResponse.json({
    success: true,
    message: `Email enviado para ${stlItems.length} arquivo(s) STL`,
    status: 'delivered',
  });
}
