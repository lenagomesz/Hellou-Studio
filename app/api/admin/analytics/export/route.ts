import { type NextRequest } from 'next/server';
import { requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { subDays, subMonths, format } from 'date-fns';

function getStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case '7d': return subDays(now, 7);
    case '30d': return subDays(now, 30);
    case '90d': return subDays(now, 90);
    case '12m': return subMonths(now, 12);
    default: return subDays(now, 30);
  }
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission('analytics.view');
  if (auth.response) return auth.response;

  const period = req.nextUrl.searchParams.get('period') ?? '30d';
  const start = getStart(period);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('orders')
    .select('id, total, status, created_at, shipping_address, user:users(email, name), items:order_items(quantity, unit_price, product_snapshot)')
    .in('status', ['paid', 'processing', 'shipped', 'delivered'])
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: false });

  if (error) return serverError('Erro ao buscar pedidos para exportacao');

  const rows: string[] = [];
  rows.push('Data,Pedido,Cliente,Email,Produto,Quantidade,Preco Unitario,Total Pedido,Status');

  for (const order of data ?? []) {
    const date = format(new Date(order.created_at), 'dd/MM/yyyy');
    const orderId = order.id.slice(0, 8).toUpperCase();
    const userObj = order.user as unknown as { name: string | null; email: string } | null;
    const customerName = userObj?.name ?? '';
    const customerEmail = userObj?.email ?? '';
    const items = (order.items ?? []) as Array<{ quantity: number; unit_price: number; product_snapshot: { product?: { name?: string } } }>;

    if (items.length === 0) {
      rows.push(`${date},${orderId},"${customerName}",${customerEmail},,,,${order.total},${order.status}`);
    } else {
      for (const item of items) {
        const productName = item.product_snapshot?.product?.name ?? 'Produto';
        rows.push(`${date},${orderId},"${customerName}",${customerEmail},"${productName}",${item.quantity},${item.unit_price},${order.total},${order.status}`);
      }
    }
  }

  const csv = rows.join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pedidos-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
    },
  });
}
