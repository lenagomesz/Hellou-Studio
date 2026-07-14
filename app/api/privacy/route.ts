import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { normalizePrivacyConsent, parsePrivacyCookie, PRIVACY_CONSENT_VERSION, PRIVACY_COOKIE_NAME } from '@/lib/privacy';

export async function GET() {
  const cookieStore = await cookies();
  return NextResponse.json({ consent: parsePrivacyCookie(cookieStore.get(PRIVACY_COOKIE_NAME)?.value) });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Preferências inválidas.' }, { status: 400 });
  }

  const input = body as { analytics?: unknown; marketing?: unknown };
  if (typeof input.analytics !== 'boolean' || typeof input.marketing !== 'boolean') {
    return NextResponse.json({ error: 'Escolha suas preferências de privacidade.' }, { status: 400 });
  }

  const consent = normalizePrivacyConsent({
    version: PRIVACY_CONSENT_VERSION,
    necessary: true,
    analytics: input.analytics,
    marketing: input.marketing,
    decidedAt: new Date().toISOString(),
  });
  if (!consent) return NextResponse.json({ error: 'Preferências inválidas.' }, { status: 400 });

  const response = NextResponse.json({ consent });
  response.cookies.set(PRIVACY_COOKIE_NAME, encodeURIComponent(JSON.stringify(consent)), {
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
    priority: 'medium',
  });

  const user = await getCurrentUser();
  if (user) {
    try {
      await getSupabaseAdmin().from('privacy_consent_logs').insert({
        user_id: user.id,
        consent_version: consent.version,
        analytics: consent.analytics,
        marketing: consent.marketing,
        source: 'cookie_banner',
      });
    } catch {
      // A preferência no navegador continua válida caso o histórico esteja indisponível.
    }
  }

  return response;
}
