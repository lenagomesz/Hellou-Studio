import { NextResponse, type NextRequest } from 'next/server';
import { requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getStoreDateGroupKey } from '@/lib/store-time';
import { subDays, subMonths } from 'date-fns';

function getDateRange(period: string) {
  const now = new Date();
  switch (period) {
    case '7d': return { start: subDays(now, 7), groupBy: 'day' as const };
    case '30d': return { start: subDays(now, 30), groupBy: 'day' as const };
    case '90d': return { start: subDays(now, 90), groupBy: 'week' as const };
    case '12m': return { start: subMonths(now, 12), groupBy: 'month' as const };
    default: return { start: subDays(now, 30), groupBy: 'day' as const };
  }
}

function groupDate(date: Date, groupBy: 'day' | 'week' | 'month'): string {
  return getStoreDateGroupKey(date, groupBy);
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission('analytics.view');
  if (auth.response) return auth.response;

  const period = req.nextUrl.searchParams.get('period') ?? '30d';
  const { start, groupBy } = getDateRange(period);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('orders')
    .select('total, created_at, status')
    .in('status', ['paid', 'processing', 'shipped', 'delivered'])
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: true });

  if (error) return serverError('Erro ao buscar dados de receita');

  const grouped = new Map<string, { revenue: number; count: number }>();

  for (const order of data ?? []) {
    const key = groupDate(new Date(order.created_at), groupBy);
    const entry = grouped.get(key) ?? { revenue: 0, count: 0 };
    entry.revenue += order.total ?? 0;
    entry.count += 1;
    grouped.set(key, entry);
  }

  const result = Array.from(grouped.entries()).map(([date, values]) => ({
    date,
    revenue: Math.round(values.revenue * 100) / 100,
    count: values.count,
  }));

  return NextResponse.json({ data: result, period, groupBy });
}
