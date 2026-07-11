import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin, badRequest, notFound, serverError } from '@/lib/api';

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();

  const { data: user } = await admin
    .from('users')
    .select('id, email, name, role, cpf, phone, is_vip, created_at')
    .eq('id', id)
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
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;

  if (id === auth.user.id) {
    return badRequest('Não é possível excluir a si mesmo');
  }

  const admin = getSupabaseAdmin();

  const { data: user } = await admin
    .from('users')
    .select('id, role')
    .eq('id', id)
    .maybeSingle();

  if (!user) return notFound('Usuário não encontrado');
  if (user.role === 'admin') return badRequest('Não é possível excluir um administrador');

  const { error } = await admin.from('users').delete().eq('id', id);
  if (error) return serverError('Erro ao excluir usuário');

  return NextResponse.json({ success: true });
}

export async function POST(req: Request, ctx: RouteCtx) {
  const auth = await requireAdmin();
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
    .select('id, email, role')
    .eq('id', id)
    .maybeSingle();

  if (!user) return notFound('Usuário não encontrado');
  if (user.role === 'admin') return badRequest('Não é possível banir um administrador');

  const { error: banError } = await admin.from('banned_emails').upsert(
    { email: user.email, reason: reason?.trim() || null, banned_by: auth.user.id },
    { onConflict: 'email' },
  );
  if (banError) return serverError('Erro ao banir email');

  const { error: delError } = await admin.from('users').delete().eq('id', id);
  if (delError) return serverError('Erro ao excluir usuário');

  return NextResponse.json({ success: true });
}
