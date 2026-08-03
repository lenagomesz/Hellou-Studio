import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { user } = auth;
  const { data, error } = await getSupabaseAdmin()
    .from('email_preferences')
    .select('subscribed, gdpr_consent, blacklisted')
    .eq('email', user.email.toLowerCase())
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Não foi possível carregar a preferência.' }, { status: 500 });
  return NextResponse.json({
    enabled: data?.subscribed === true && data.gdpr_consent === true && data.blacklisted !== true,
    blacklisted: data?.blacklisted === true,
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { user } = auth;
  const body = await request.json().catch(() => null) as { enabled?: unknown } | null;
  if (typeof body?.enabled !== 'boolean') {
    return NextResponse.json({ error: 'Preferência inválida.' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const email = user.email.toLowerCase();
  const { data: current } = await admin.from('email_preferences').select('blacklisted').eq('email', email).maybeSingle();
  if (body.enabled && current?.blacklisted) {
    return NextResponse.json({ error: 'Este e-mail está bloqueado por falhas de entrega. Fale com nosso atendimento.' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { error } = await admin.from('email_preferences').upsert({
    user_id: user.id,
    email,
    subscribed: body.enabled,
    unsubscribed_at: body.enabled ? null : now,
    unsubscribe_reason: body.enabled ? null : 'Preferência alterada na conta',
    gdpr_consent: body.enabled,
    gdpr_consent_at: body.enabled ? now : null,
    updated_at: now,
  }, { onConflict: 'email' });
  if (error) return NextResponse.json({ error: 'Não foi possível salvar a preferência.' }, { status: 500 });
  return NextResponse.json({ enabled: body.enabled });
}
