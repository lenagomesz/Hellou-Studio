import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser, badRequest, notFound, serverError } from '@/lib/api';
import { sendAdminNewPrintRequestEmail } from '@/lib/email';
import type { PrintRequest } from '@/types/database';

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();

  const { data: original, error: fetchErr } = await admin
    .from('print_requests')
    .select('*')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (fetchErr) return serverError('Erro ao buscar solicitação');
  if (!original) return notFound('Solicitação não encontrada');
  if (!['paid', 'in_production', 'shipped', 'delivered'].includes(original.status)) {
    return badRequest('A solicitação só pode ser refeita depois da confirmação da compra');
  }

  const { data, error } = await admin
    .from('print_requests')
    .insert({
      user_id: auth.user.id,
      title: original.title,
      description: original.description,
      notes: original.notes,
      stl_file_url: original.stl_file_url,
      stl_file_name: original.stl_file_name,
      stl_file_size: original.stl_file_size,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[reorder] insert error:', error);
    return serverError('Erro ao criar solicitação');
  }

  const { data: currentUser } = await admin
    .from('users')
    .select('email, name')
    .eq('id', auth.user.id)
    .single();

  sendAdminNewPrintRequestEmail({
    adminEmail: 'studiohellou@gmail.com',
    requestId: data.id,
    title: data.title,
    customerName: currentUser?.name ?? null,
    customerEmail: currentUser?.email ?? auth.user.email ?? '',
  }).catch(() => {});

  return NextResponse.json({ request: data as PrintRequest }, { status: 201 });
}
