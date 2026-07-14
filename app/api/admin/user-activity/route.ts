import { NextResponse, type NextRequest } from 'next/server';
import { requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await requirePermission('audit.view');
  if (auth.response) return auth.response;

  const days = Math.min(90, Math.max(1, Number(request.nextUrl.searchParams.get('days') ?? 7)));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const activeSince = new Date(Date.now() - 15 * 60_000).toISOString();
  const admin = getSupabaseAdmin();

  const [eventsResult, activeResult, customersResult] = await Promise.all([
    admin
      .from('user_activity_events')
      .select('id, event_type, path, entity_type, entity_id, created_at, user:users(id, name, email)')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500),
    admin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'user').gte('last_seen_at', activeSince),
    admin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'user'),
  ]);

  if (eventsResult.error) return serverError('Erro ao carregar atividades. Aplique a migration mais recente no Supabase.');

  const events = eventsResult.data ?? [];
  const uniqueUsers = new Set(events.map((event) => {
    const user = Array.isArray(event.user) ? event.user[0] : event.user;
    return user?.id;
  }).filter(Boolean));
  const pathCounts = new Map<string, number>();
  const eventCounts = new Map<string, number>();
  for (const event of events) {
    if (event.path) pathCounts.set(event.path, (pathCounts.get(event.path) ?? 0) + 1);
    eventCounts.set(event.event_type, (eventCounts.get(event.event_type) ?? 0) + 1);
  }

  return NextResponse.json({
    events: events.slice(0, 150),
    summary: {
      periodDays: days,
      totalEvents: events.length,
      engagedUsers: uniqueUsers.size,
      activeNow: activeResult.count ?? 0,
      totalCustomers: customersResult.count ?? 0,
      topPaths: [...pathCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, count]) => ({ path, count })),
      eventTypes: [...eventCounts.entries()].map(([type, count]) => ({ type, count })),
    },
  });
}
