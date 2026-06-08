import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { subDays, subMonths, format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';

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
  switch (groupBy) {
    case 'day': return format(startOfDay(date), 'yyyy-MM-dd');
    case 'week': return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    case 'month': return format(startOfMonth(date), 'yyyy-MM');
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const period = req.nextUrl.searchParams.get('period') ?? '30d';
  const { start, groupBy } = getDateRange(period);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('users')
    .select('created_at')
    .eq('role', 'user')
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: true });

  if (error) return serverError('Erro ao buscar dados de usuarios');

  const grouped = new Map<string, number>();

  for (const user of data ?? []) {
    const key = groupDate(new Date(user.created_at), groupBy);
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }

  const result = Array.from(grouped.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  return NextResponse.json({ data: result, period, groupBy });
}
