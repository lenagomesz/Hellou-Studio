import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission, badRequest, notFound, serverError } from '@/lib/api';
import { deletedCustomerPatch } from '@/lib/user-deletion';

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const auth = await requirePermission('customers.view');
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();

  const { data: user } = await admin
    .from('users')
    .select('id, email, name, role, cpf, phone, is_vip, created_at')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!user) return notFound('Usuário não encontrado');

  const { data: orders } = await admin
    .from('orders')
    .select('id, status, total, created_at, shipping_address')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: addresses } = await admin
    .from('addresses')
    .select('*')
    .eq('user_id', id)
    .limit(5);

  return NextResponse.json({ user, orders: orders ?? [], addresses: addresses ?? [] });
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const auth = await requirePermission('customers.delete');
  if (auth.response) return auth.response;

  const { id } = await ctx.params;

  if (id === auth.user.id) {
    return badRequest('Não é possível excluir a si mesmo');
  }

  const admin = getSupabaseAdmin();

  const { data: user } = await admin
    .from('users')
    .select('id, role, email, session_version')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!user) return notFound('Usuário não encontrado');
  if (user.role === 'admin') return badRequest('Não é possível excluir um administrador');

  const deletedAt = new Date().toISOString();
  const deletedEmail = `deleted.${id}@deleted.invalid`;
  const { data: deleted, error } = await admin
    .from('users')
    .update(deletedCustomerPatch(id, Number(user.session_version ?? 0), deletedAt))
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error) return serverError('Erro ao excluir usuário');
  if (!deleted) return notFound('Usuário não encontrado');

  const { error: preferenceError } = await admin
    .from('email_preferences')
    .update({ email: deletedEmail, subscribed: false, gdpr_consent: false, unsubscribed_at: deletedAt, updated_at: deletedAt })
    .eq('user_id', id);
  if (preferenceError && preferenceError.code !== '42P01') {
    console.error('[users] Não foi possível anonimizar a preferência de email do cliente excluído.');
  }

  return NextResponse.json({ success: true });
}

export async function POST(req: Request, ctx: RouteCtx) {
  const auth = await requirePermission('customers.delete');
  if (auth.response) return auth.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const { action, reason } = (body ?? {}) as { action?: string; reason?: string };

  if (action !== 'ban') {
    return badRequest('Ação inválida');
  }

  const admin = getSupabaseAdmin();

  const { data: user } = await admin
    .from('users')
    .select('id, email, role, session_version')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!user) return notFound('Usuário não encontrado');
  if (user.role === 'admin') return badRequest('Não é possível banir um administrador');

  const { error: banError } = await admin.from('banned_emails').upsert(
    { email: user.email, reason: reason?.trim() || null, banned_by: auth.user.id },
    { onConflict: 'email' },
  );
  if (banError) return serverError('Erro ao banir email');

  const deletedAt = new Date().toISOString();
  const deletedEmail = `deleted.${id}@deleted.invalid`;
  const { data: deleted, error: delError } = await admin
    .from('users')
    .update(deletedCustomerPatch(id, Number(user.session_version ?? 0), deletedAt))
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (delError) return serverError('Erro ao excluir usuário');
  if (!deleted) return notFound('Usuário não encontrado');

  const { error: preferenceError } = await admin
    .from('email_preferences')
    .update({ email: deletedEmail, subscribed: false, gdpr_consent: false, unsubscribed_at: deletedAt, updated_at: deletedAt })
    .eq('user_id', id);
  if (preferenceError && preferenceError.code !== '42P01') {
    console.error('[users] Não foi possível anonimizar a preferência de email do cliente banido.');
  }

  return NextResponse.json({ success: true });
}
