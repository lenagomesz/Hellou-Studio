import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser, badRequest, notFound, serverError } from '@/lib/api';
import { sendPrintRequestStatusEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';
import type { PrintRequest, PrintRequestStatus } from '@/types/database';

const VALID_STATUSES: PrintRequestStatus[] = [
  'pending', 'needs_info', 'quoted', 'approved', 'paid', 'in_production',
  'shipped', 'delivered', 'rejected', 'canceled',
];

const LOCKED_STATUSES: PrintRequestStatus[] = ['paid', 'in_production', 'shipped', 'delivered'];

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from('print_requests')
    .select('*, user:users(id, email, name)')
    .eq('id', id)
    .maybeSingle();

  if (error) return serverError('Erro ao buscar solicitação');
  if (!data) return notFound('Solicitação não encontrada');

  if (auth.user.role !== 'admin' && data.user_id !== auth.user.id) {
    return notFound('Solicitação não encontrada');
  }

  return NextResponse.json({ request: data });
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON inválido');
  }

  const input = (body ?? {}) as {
    status?: string;
    quoted_price?: number | null;
    admin_notes?: string | null;
    rejection_reason?: string | null;
    user_response?: string | null;
  };

  const admin = getSupabaseAdmin();

  // Non-admin users can only send a response when status is needs_info
  if (auth.user.role !== 'admin') {
    if (input.user_response === undefined) {
      return badRequest('Sem permissão');
    }

    const { data: current } = await admin
      .from('print_requests')
      .select('status, user_id')
      .eq('id', id)
      .maybeSingle();

    if (!current || current.user_id !== auth.user.id) {
      return notFound('Solicitação não encontrada');
    }
    if (current.status !== 'needs_info') {
      return badRequest('Solicitação não está aguardando informações');
    }

    const { data, error } = await admin
      .from('print_requests')
      .update({
        user_response: input.user_response?.trim() || null,
        status: 'pending',
      })
      .eq('id', id)
      .select('*, user:users(id, email, name)')
      .maybeSingle();

    if (error) return serverError('Erro ao enviar resposta');
    if (!data) return notFound('Solicitação não encontrada');

    return NextResponse.json({ request: data });
  }

  // Admin flow
  const { data: currentRequest } = await admin
    .from('print_requests')
    .select('status')
    .eq('id', id)
    .maybeSingle();

  if (!currentRequest) return notFound('Solicitação não encontrada');
  if (LOCKED_STATUSES.includes(currentRequest.status as PrintRequestStatus)) {
    return badRequest('Esta solicitação já foi paga e está protegida contra novas alterações');
  }

  const update: Record<string, unknown> = {};

  if (input.status !== undefined) {
    if (!VALID_STATUSES.includes(input.status as PrintRequestStatus)) {
      return badRequest('Status inválido');
    }
    update.status = input.status;
  }

  if (input.quoted_price !== undefined) {
    if (input.quoted_price !== null && (typeof input.quoted_price !== 'number' || input.quoted_price < 0)) {
      return badRequest('Preço inválido');
    }
    update.quoted_price = input.quoted_price;
  }

  if (input.admin_notes !== undefined) {
    update.admin_notes = input.admin_notes?.trim() || null;
  }

  if (input.rejection_reason !== undefined) {
    update.rejection_reason = input.rejection_reason?.trim() || null;
  }

  if (Object.keys(update).length === 0) {
    return badRequest('Nenhum campo para atualizar');
  }

  const { data, error } = await admin
    .from('print_requests')
    .update(update)
    .eq('id', id)
    .select('*, user:users(id, email, name)')
    .maybeSingle();

  if (error) return serverError('Erro ao atualizar solicitação');
  if (!data) return notFound('Solicitação não encontrada');

  const printRequest = data as PrintRequest & { user?: { id: string; email: string; name: string | null } | null };

  // Product creation is handled by /api/print-requests/[id]/buy when user clicks "Prosseguir"

  // Send status email to the user
  const userEmail = printRequest.user?.email;
  const userName = printRequest.user?.name ?? null;

  if (userEmail) {
    sendPrintRequestStatusEmail({
      email: userEmail,
      nome: userName,
      title: printRequest.title,
      newStatus: printRequest.status,
      quotedPrice: printRequest.quoted_price,
      rejectionReason: printRequest.rejection_reason,
      productId: printRequest.product_id,
      requestId: printRequest.id,
    }).catch(() => {});
  }

  const prStatusLabels: Record<string, string> = {
    pending: 'Pendente',
    needs_info: 'Aguardando informações',
    quoted: 'Orçado',
    approved: 'Aprovado',
    paid: 'Pago',
    in_production: 'Em produção',
    shipped: 'Enviado',
    delivered: 'Entregue',
    rejected: 'Rejeitado',
    canceled: 'Cancelado',
  };

  const prLabel = prStatusLabels[printRequest.status] ?? printRequest.status;
  createNotification(
    printRequest.user_id,
    'print_request_status',
    `Impressão "${printRequest.title}" — ${prLabel}`,
    null,
    { print_request_id: printRequest.id, status: printRequest.status },
  ).catch(() => {});

  return NextResponse.json({ request: printRequest });
}
