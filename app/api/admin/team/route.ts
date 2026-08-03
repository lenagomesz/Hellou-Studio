import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { badRequest, requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendPartnerWelcomeEmail } from '@/lib/email';

export async function GET() {
  const auth = await requirePermission('team.manage');
  if (auth.response) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('id, name, email, admin_access_level, admin_active, last_login_at, created_at')
    .eq('role', 'admin')
    .order('created_at', { ascending: true });

  if (error) return serverError('Erro ao carregar a equipe. Aplique a migration mais recente no Supabase.');
  return NextResponse.json({ members: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requirePermission('team.manage');
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null) as { name?: string; email?: string; password?: string } | null;
  const name = body?.name?.trim() ?? '';
  const email = body?.email?.trim().toLowerCase() ?? '';
  const password = body?.password ?? '';
  if (name.length < 2) return badRequest('Informe o nome da sócia');
  if (!/^\S+@\S+\.\S+$/.test(email)) return badRequest('Informe um e-mail válido');
  if (password.length < 10) return badRequest('A senha temporária deve ter pelo menos 10 caracteres');

  const admin = getSupabaseAdmin();
  const { data: existing } = await admin.from('users').select('id').eq('email', email).maybeSingle();
  if (existing) return badRequest('Já existe uma conta com este e-mail');

  const passwordHash = await bcrypt.hash(password, 12);
  const { data, error } = await admin.from('users').insert({
    name,
    email,
    password_hash: passwordHash,
    role: 'admin',
    admin_access_level: 'partner',
    admin_active: true,
  }).select('id, name, email, admin_access_level, admin_active, last_login_at, created_at').single();

  if (error) return serverError(`Erro ao criar acesso: ${error.message}`);
  const welcomeEmailSent = await sendPartnerWelcomeEmail(email, name);
  return NextResponse.json({ member: data, welcome_email_sent: welcomeEmailSent }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requirePermission('team.manage');
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null) as {
    id?: string;
    active?: boolean;
    role?: 'user' | 'admin';
  } | null;
  if (!body?.id) return badRequest('Dados inválidos');
  if (body.id === auth.user.id) return badRequest('Você não pode alterar o próprio acesso');

  const admin = getSupabaseAdmin();

  if (body.role) {
    const { data: target, error: targetError } = await admin
      .from('users')
      .select('id, name, email, role, admin_access_level')
      .eq('id', body.id)
      .maybeSingle();

    if (targetError) return serverError('Erro ao consultar o usuário');
    if (!target) return badRequest('Usuário não encontrado');
    if (target.admin_access_level === 'owner') return badRequest('A administradora principal não pode ser rebaixada');

    const promoting = body.role === 'admin';
    if (target.role === body.role) return badRequest(promoting ? 'Este usuário já é administrador' : 'Este perfil já é um usuário comum');

    const { data, error } = await admin
      .from('users')
      .update(promoting
        ? { role: 'admin', admin_access_level: 'partner', admin_permissions: null, admin_active: true }
        : { role: 'user', admin_access_level: null, admin_permissions: null, admin_active: true })
      .eq('id', body.id)
      .select('id, name, email, role, admin_access_level, admin_active, last_login_at, created_at')
      .single();

    if (error) return serverError('Erro ao alterar o tipo de acesso');
    await admin.rpc('revoke_user_sessions', { p_user_id: body.id });

    const welcomeEmailSent = promoting
      ? await sendPartnerWelcomeEmail(target.email, target.name || target.email)
      : false;
    return NextResponse.json({ member: data, welcome_email_sent: welcomeEmailSent });
  }

  if (typeof body.active !== 'boolean') return badRequest('Dados inválidos');

  const { data, error } = await admin
    .from('users')
    .update({ admin_active: body.active })
    .eq('id', body.id)
    .eq('role', 'admin')
    .eq('admin_access_level', 'partner')
    .select('id, admin_active')
    .maybeSingle();

  if (error) return serverError('Erro ao alterar o acesso');
  if (!data) return badRequest('Só é possível alterar acessos de sócios operacionais');
  await admin.rpc('revoke_user_sessions', { p_user_id: body.id });
  return NextResponse.json({ member: data });
}
