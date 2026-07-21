import { createHash, randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { parsePrivacyCookie, PRIVACY_COOKIE_NAME } from '@/lib/privacy';
import { rateLimit } from '@/lib/rate-limit';
import { classifyDevice } from '@/lib/site-analytics';

export const runtime = 'nodejs';

const VISITOR_COOKIE = 'hellou_visitor';
const SESSION_COOKIE = 'hellou_visit_session';

function hashIdentifier(value: string) {
  const salt = process.env.ANALYTICS_HASH_SALT || process.env.NEXTAUTH_SECRET || 'hellou-site-analytics';
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

function shortValue(value: string | null) {
  return value?.trim().slice(0, 120) || null;
}

function externalReferrerHost(raw: unknown, currentHost: string) {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return host && host !== currentHost.toLowerCase() ? host.slice(0, 180) : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const consent = parsePrivacyCookie(request.cookies.get(PRIVACY_COOKIE_NAME)?.value);
  if (!consent?.analytics) return new NextResponse(null, { status: 204 });

  const body = await request.json().catch(() => null) as { path?: unknown; referrer?: unknown } | null;
  if (typeof body?.path !== 'string' || !body.path.startsWith('/') || body.path.length > 1000) {
    return NextResponse.json({ error: 'Caminho inválido' }, { status: 400 });
  }

  let parsedPath: URL;
  try {
    parsedPath = new URL(body.path, 'https://hellou.local');
  } catch {
    return NextResponse.json({ error: 'Caminho inválido' }, { status: 400 });
  }
  const pathname = parsedPath.pathname.replace(/\/{2,}/g, '/').slice(0, 500);
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api') || pathname.startsWith('/admin')) {
    return new NextResponse(null, { status: 204 });
  }

  const currentVisitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const currentSessionId = request.cookies.get(SESSION_COOKIE)?.value;
  const visitorId = currentVisitorId || randomUUID();
  const sessionId = currentSessionId || randomUUID();
  const fallbackRateKey = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('user-agent') || 'unknown';
  const limit = rateLimit(`anonymous-traffic:${hashIdentifier(currentVisitorId || fallbackRateKey)}`, {
    maxRequests: 120,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.success) return new NextResponse(null, { status: 204 });

  const now = new Date().toISOString();
  const visitorHash = hashIdentifier(visitorId);
  const sessionHash = hashIdentifier(sessionId);
  const referrerHost = externalReferrerHost(body.referrer, request.nextUrl.hostname);
  const common = {
    visitor_hash: visitorHash,
    session_hash: sessionHash,
    path: pathname || '/',
    referrer_host: referrerHost,
    utm_source: shortValue(parsedPath.searchParams.get('utm_source')),
    utm_medium: shortValue(parsedPath.searchParams.get('utm_medium')),
    utm_campaign: shortValue(parsedPath.searchParams.get('utm_campaign')),
    device_type: classifyDevice(request.headers.get('user-agent') || ''),
    created_at: now,
  };
  const events = [
    ...(!currentSessionId ? [{ ...common, event_type: 'session_start' }] : []),
    { ...common, event_type: 'page_view' },
  ];

  const { error } = await getSupabaseAdmin().from('site_analytics_events').insert(events);
  if (error) {
    console.warn('[site-analytics] Evento não registrado:', error.message);
    return new NextResponse(null, { status: 202 });
  }

  const response = new NextResponse(null, { status: 204 });
  if (!currentVisitorId) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    });
  }
  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 60,
  });
  return response;
}
