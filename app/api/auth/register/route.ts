import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendWelcomeEmail } from '@/lib/email';
import { isValidCpf, cleanCpf } from '@/lib/cpf';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { email, password, name, phone, cpf, marketingConsent } = (body ?? {}) as {
    email?: string;
    password?: string;
    name?: string;
    phone?: string;
    cpf?: string;
    marketingConsent?: boolean;
  };

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email e senha são obrigatórios' },
      { status: 400 },
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (!EMAIL_RE.test(normalizedEmail)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'A senha deve ter no mínimo 8 caracteres' },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();

  const { data: banned } = await admin
    .from('banned_emails')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (banned) {
    return NextResponse.json(
      { error: 'Este email não pode ser utilizado para criar uma conta' },
      { status: 403 },
    );
  }

  const { data: existing } = await admin
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'Já existe uma conta com este email' },
      { status: 409 },
    );
  }

  const password_hash = await bcrypt.hash(password, 12);

  const cleanPhone = phone?.replace(/\D/g, '').trim() || null;

  let cleanedCpf: string | null = null;
  if (cpf) {
    const digits = cleanCpf(cpf);
    if (digits.length > 0 && !isValidCpf(digits)) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
    }
    if (digits.length === 11) cleanedCpf = digits;
  }

  const { data: created, error } = await admin
    .from('users')
    .insert({
      email: normalizedEmail,
      password_hash,
      name: name?.trim() || null,
      phone: cleanPhone,
      cpf: cleanedCpf,
      role: 'user',
    })
    .select('id, email, name, role')
    .single();

  if (error || !created) {
    return NextResponse.json(
      { error: 'Não foi possível criar a conta' },
      { status: 500 },
    );
  }

  const consentGranted = marketingConsent === true;
  const preferenceTimestamp = new Date().toISOString();
  const { error: preferenceError } = await admin
    .from('email_preferences')
    .upsert(
      {
        user_id: created.id,
        email: normalizedEmail,
        subscribed: consentGranted,
        unsubscribed_at: consentGranted ? null : preferenceTimestamp,
        unsubscribe_reason: consentGranted ? null : 'Consentimento não concedido no cadastro',
        gdpr_consent: consentGranted,
        gdpr_consent_at: consentGranted ? preferenceTimestamp : null,
        updated_at: preferenceTimestamp,
      },
      { onConflict: 'email' },
    );

  if (preferenceError) {
    console.error('[register] não foi possível salvar a preferência de marketing:', preferenceError);
  }

  try {
    await sendWelcomeEmail(created.email, created.name);
  } catch (err) {
    console.error('[register] email de boas-vindas falhou:', err);
  }

  return NextResponse.json({ user: created }, { status: 201 });
}
