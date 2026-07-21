import { NextResponse, type NextRequest } from 'next/server';
import { requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { aggregateTraffic, type SiteAnalyticsEvent } from '@/lib/site-analytics';

export async function GET(request: NextRequest) {
  const auth = await requirePermission('analytics.view');
  if (auth.response) return auth.response;

  const days = Math.min(90, Math.max(1, Number(request.nextUrl.searchParams.get('days') ?? 30)));
  const now = new Date();
  const currentStart = new Date(now.getTime() - days * 86_400_000);
  const previousStart = new Date(now.getTime() - days * 2 * 86_400_000);
  const { data, error } = await getSupabaseAdmin()
    .from('site_analytics_events')
    .select('visitor_hash, session_hash, event_type, path, referrer_host, utm_source, utm_medium, utm_campaign, device_type, created_at')
    .gte('created_at', previousStart.toISOString())
    .order('created_at', { ascending: true })
    .limit(50_000);

  if (error) return serverError('Não foi possível carregar o tráfego. Aplique a migration 20260720_site_analytics.sql no Supabase.');

  const events = (data ?? []) as SiteAnalyticsEvent[];
  const currentEvents = events.filter((event) => new Date(event.created_at) >= currentStart);
  const previousEvents = events.filter((event) => {
    const createdAt = new Date(event.created_at);
    return createdAt >= previousStart && createdAt < currentStart;
  });

  return NextResponse.json({
    periodDays: days,
    summary: aggregateTraffic(currentEvents, previousEvents, now),
    privacy: {
      anonymousOnly: true,
      consentRequired: true,
      rawIpStored: false,
    },
  });
}

