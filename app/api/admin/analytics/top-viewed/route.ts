import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { subDays, subMonths } from 'date-fns';

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
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const period = req.nextUrl.searchParams.get('period') ?? '30d';
  const start = getStart(period);

  const admin = getSupabaseAdmin();

  // Fetch product views in the period
  const { data: views, error: viewsError } = await admin
    .from('product_views')
    .select('product_id, viewed_at')
    .gte('viewed_at', start.toISOString());

  if (viewsError) return serverError('Erro ao buscar visualizações');

  // Count views per product
  const viewCounts = new Map<string, number>();
  for (const view of views ?? []) {
    viewCounts.set(view.product_id, (viewCounts.get(view.product_id) ?? 0) + 1);
  }

  // Get top 10 product IDs by views
  const topProductIds = Array.from(viewCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  if (topProductIds.length === 0) {
    return NextResponse.json({ products: [], period });
  }

  // Fetch product details
  const { data: products } = await admin
    .from('products')
    .select('id, name, category')
    .in('id', topProductIds);

  const productMap = new Map((products ?? []).map(p => [p.id, p]));

  // Fetch order items for these products in the period to get revenue and units
  const { data: orderItems } = await admin
    .from('order_items')
    .select('product_id, quantity, unit_price, order:orders!inner(created_at, status)')
    .in('product_id', topProductIds)
    .in('order.status', ['paid', 'processing', 'shipped', 'delivered'])
    .gte('order.created_at', start.toISOString());

  // Aggregate revenue and units sold per product
  const salesStats = new Map<string, { revenue: number; units_sold: number }>();
  for (const item of orderItems ?? []) {
    const existing = salesStats.get(item.product_id) ?? { revenue: 0, units_sold: 0 };
    existing.revenue += (item.unit_price ?? 0) * item.quantity;
    existing.units_sold += item.quantity;
    salesStats.set(item.product_id, existing);
  }

  // Build response with top products sorted by views
  const result = topProductIds.map(id => {
    const product = productMap.get(id);
    const views = viewCounts.get(id) ?? 0;
    const sales = salesStats.get(id) ?? { revenue: 0, units_sold: 0 };

    return {
      id,
      name: product?.name ?? 'Produto removido',
      category: product?.category ?? '',
      views,
      revenue: Math.round(sales.revenue * 100) / 100,
      units_sold: sales.units_sold,
    };
  });

  return NextResponse.json({ products: result, period });
}
