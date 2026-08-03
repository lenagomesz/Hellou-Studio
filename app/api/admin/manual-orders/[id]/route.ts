import { NextResponse } from 'next/server';
import { badRequest, notFound, requirePermission, serverError } from '@/lib/api';
import { sendManualOrderInviteEmail } from '@/lib/email';
import {
  MANUAL_ORDER_EMAIL_RE,
  MANUAL_ORDER_PAYMENT_STATUSES,
  MANUAL_ORDER_STATUSES,
  normalizeManualOrderEmail,
} from '@/lib/manual-orders';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { ManualOrderPaymentStatus, ManualOrderStatus } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };

type ManualOrderUpdate = {
  user_id?: string | null;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string | null;
  title?: string;
  description?: string | null;
  quantity?: number;
  total?: number;
  payment_status?: ManualOrderPaymentStatus;
  status?: ManualOrderStatus;
  internal_notes?: string | null;
  send_invite?: boolean;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requirePermission('requests.manage');
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const { data, error } = await getSupabaseAdmin()
    .from('manual_orders')
    .select('*, user:users!manual_orders_user_id_fkey(id, email, name)')
    .eq('id', id)
    .maybeSingle();
  if (error) return serverError('Erro ao carregar encomenda');
  if (!data) return notFound('Encomenda não encontrada');
  return NextResponse.json({ order: data });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requirePermission('requests.manage');
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const input = await request.json().catch(() => null) as ManualOrderUpdate | null;
  if (!input) return badRequest('Dados inválidos');

  const admin = getSupabaseAdmin();
  const { data: current } = await admin.from('manual_orders').select('*').eq('id', id).maybeSingle();
  if (!current) return notFound('Encomenda não encontrada');

  const customerName = input.customer_name?.trim() ?? current.customer_name;
  const customerEmail = normalizeManualOrderEmail(input.customer_email ?? current.customer_email);
  const title = input.title?.trim() ?? current.title;
  const quantity = Number(input.quantity ?? current.quantity);
  const total = Number(input.total ?? current.total);
  const paymentStatus = input.payment_status ?? current.payment_status;
  const status = input.status ?? current.status;

  if (customerName.length < 2) return badRequest('Informe o nome do cliente');
  if (!MANUAL_ORDER_EMAIL_RE.test(customerEmail)) return badRequest('Informe um e-mail válido');
  if (!title) return badRequest('Informe o título da encomenda');
  if (!Number.isInteger(quantity) || quantity < 1) return badRequest('Quantidade inválida');
  if (!Number.isFinite(total) || total < 0) return badRequest('Valor inválido');
  if (!MANUAL_ORDER_PAYMENT_STATUSES.includes(paymentStatus)) return badRequest('Situação do pagamento inválida');
  if (!MANUAL_ORDER_STATUSES.includes(status)) return badRequest('Status da encomenda inválido');

  let linkedUser: { id: string; email: string; name: string | null } | null = null;
  if (input.user_id) {
    const { data } = await admin.from('users').select('id, email, name').eq('id', input.user_id).maybeSingle();
    if (!data) return badRequest('Usuário selecionado não foi encontrado');
    linkedUser = data;
  } else if (input.user_id === null) {
    const { data } = await admin.from('users').select('id, email, name').eq('email', customerEmail).maybeSingle();
    linkedUser = data;
  } else if (current.user_id) {
    const { data } = await admin.from('users').select('id, email, name').eq('id', current.user_id).maybeSingle();
    linkedUser = data;
  }

  const update = {
    user_id: linkedUser?.id ?? null,
    customer_name: customerName,
    customer_email: linkedUser?.email ?? customerEmail,
    customer_phone: input.customer_phone === undefined ? current.customer_phone : input.customer_phone?.trim() || null,
    title,
    description: input.description === undefined ? current.description : input.description?.trim() || null,
    quantity,
    total,
    payment_status: paymentStatus,
    status,
    internal_notes: input.internal_notes === undefined ? current.internal_notes : input.internal_notes?.trim() || null,
  };

  const { data, error } = await admin.from('manual_orders').update(update).eq('id', id)
    .select('*, user:users!manual_orders_user_id_fkey(id, email, name)').single();
  if (error || !data) return serverError('Erro ao atualizar encomenda');

  let inviteSent = false;
  if (!linkedUser && input.send_invite) {
    inviteSent = await sendManualOrderInviteEmail({
      email: update.customer_email,
      customerName,
      orderTitle: title,
      manualOrderId: id,
    });
    if (inviteSent) {
      const inviteSentAt = new Date().toISOString();
      await admin.from('manual_orders').update({ invite_sent_at: inviteSentAt }).eq('id', id);
      data.invite_sent_at = inviteSentAt;
    }
  }

  return NextResponse.json({ order: data, invite_sent: inviteSent });
}
