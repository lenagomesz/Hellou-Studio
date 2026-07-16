import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission, badRequest, serverError } from '@/lib/api';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('customers.manage');
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('JSON invalido');
  }

  const { userId, isVip } = (body ?? {}) as { userId?: string; isVip?: boolean };

  if (!userId || typeof isVip !== 'boolean') {
    return badRequest('userId e isVip sao obrigatorios');
  }

  const admin = getSupabaseAdmin();

  const { error } = await admin
    .from('users')
    .update({ is_vip: isVip })
    .eq('id', userId);

  if (error) return serverError('Erro ao atualizar VIP status');

  return NextResponse.json({ success: true, userId, isVip });
}

// Bulk VIP update
export async function PUT(req: NextRequest) {
  const auth = await requirePermission('customers.manage');
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('JSON invalido');
  }

  const { userIds, isVip } = (body ?? {}) as { userIds?: string[]; isVip?: boolean };

  if (!userIds || !Array.isArray(userIds) || typeof isVip !== 'boolean') {
    return badRequest('userIds (array) e isVip sao obrigatorios');
  }

  const admin = getSupabaseAdmin();

  const { error } = await admin
    .from('users')
    .update({ is_vip: isVip })
    .in('id', userIds);

  if (error) return serverError('Erro ao atualizar VIP status em lote');

  return NextResponse.json({ success: true, updated: userIds.length });
}
