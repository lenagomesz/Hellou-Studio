import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendWelcomeEmail } from '@/lib/email';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { email, password, name, phone } = (body ?? {}) as {
    email?: string;
    password?: string;
    name?: string;
    phone?: string;
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

  const { data: created, error } = await admin
    .from('users')
    .insert({
      email: normalizedEmail,
      password_hash,
      name: name?.trim() || null,
      phone: cleanPhone,
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

  try {
    await sendWelcomeEmail(created.email, created.name);
  } catch (err) {
    console.error('[register] email de boas-vindas falhou:', err);
  }

  return NextResponse.json({ user: created }, { status: 201 });
}
