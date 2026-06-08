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

  const { data: orderItems, error } = await admin
    .from('order_items')
    .select('product_id, quantity, unit_price, order:orders!inner(created_at, status)')
    .in('order.status', ['paid', 'processing', 'shipped', 'delivered'])
    .gte('order.created_at', start.toISOString());

  if (error) return serverError('Erro ao buscar itens de pedido');

  const { data: products } = await admin
    .from('products')
    .select('id, name, category');

  const productMap = new Map((products ?? []).map(p => [p.id, p]));

  const productStats = new Map<string, { name: string; category: string; units: number; revenue: number }>();
  const categoryStats = new Map<string, { revenue: number; units: number }>();

  for (const item of orderItems ?? []) {
    const product = productMap.get(item.product_id);
    if (!product) continue;

    const revenue = (item.unit_price ?? 0) * item.quantity;

    const existing = productStats.get(item.product_id) ?? {
      name: product.name,
      category: product.category,
      units: 0,
      revenue: 0,
    };
    existing.units += item.quantity;
    existing.revenue += revenue;
    productStats.set(item.product_id, existing);

    const catEntry = categoryStats.get(product.category) ?? { revenue: 0, units: 0 };
    catEntry.revenue += revenue;
    catEntry.units += item.quantity;
    categoryStats.set(product.category, catEntry);
  }

  const topProducts = Array.from(productStats.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map(p => ({
      ...p,
      revenue: Math.round(p.revenue * 100) / 100,
    }));

  const categories = Array.from(categoryStats.entries()).map(([name, stats]) => ({
    name,
    revenue: Math.round(stats.revenue * 100) / 100,
    units: stats.units,
  }));

  return NextResponse.json({ topProducts, categories, period });
}
