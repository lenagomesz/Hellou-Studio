import { NextResponse } from 'next/server';
import { badRequest, requirePermission, serverError } from '@/lib/api';
import { sendManualOrderInviteEmail } from '@/lib/email';
import {
  MANUAL_ORDER_EMAIL_RE,
  MANUAL_ORDER_PAYMENT_STATUSES,
  MANUAL_ORDER_STATUSES,
  normalizeManualOrderEmail,
} from '@/lib/manual-orders';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { ManualOrderPaymentStatus, ManualOrderStatus } from '@/types/database';

type ManualOrderInput = {
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

export async function GET() {
  const auth = await requirePermission('requests.manage');
  if (auth.response) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from('manual_orders')
    .select('*, user:users!manual_orders_user_id_fkey(id, email, name)')
    .order('created_at', { ascending: false });

  if (error) return serverError('Erro ao carregar encomendas externas. Aplique a migration mais recente no Supabase.');
  return NextResponse.json({ orders: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requirePermission('requests.manage');
  if (auth.response) return auth.response;

  const input = await request.json().catch(() => null) as ManualOrderInput | null;
  const customerName = input?.customer_name?.trim() ?? '';
  const customerEmail = normalizeManualOrderEmail(input?.customer_email ?? '');
  const title = input?.title?.trim() ?? '';
  const quantity = Number(input?.quantity ?? 1);
  const total = Number(input?.total ?? 0);
  const paymentStatus = input?.payment_status ?? 'pending';
  const status = input?.status ?? 'pending';

  if (customerName.length < 2) return badRequest('Informe o nome do cliente');
  if (!MANUAL_ORDER_EMAIL_RE.test(customerEmail)) return badRequest('Informe um e-mail válido');
  if (!title) return badRequest('Informe o título da encomenda');
  if (!Number.isInteger(quantity) || quantity < 1) return badRequest('Quantidade inválida');
  if (!Number.isFinite(total) || total < 0) return badRequest('Valor inválido');
  if (!MANUAL_ORDER_PAYMENT_STATUSES.includes(paymentStatus)) return badRequest('Situação do pagamento inválida');
  if (!MANUAL_ORDER_STATUSES.includes(status)) return badRequest('Status da encomenda inválido');

  const admin = getSupabaseAdmin();
  let linkedUser: { id: string; email: string; name: string | null } | null = null;

  if (input?.user_id) {
    const { data } = await admin.from('users').select('id, email, name').eq('id', input.user_id).maybeSingle();
    if (!data) return badRequest('Usuário selecionado não foi encontrado');
    linkedUser = data;
  } else {
    const { data } = await admin.from('users').select('id, email, name').eq('email', customerEmail).maybeSingle();
    linkedUser = data;
  }

  const { data, error } = await admin.from('manual_orders').insert({
    user_id: linkedUser?.id ?? null,
    customer_name: customerName,
    customer_email: linkedUser?.email ?? customerEmail,
    customer_phone: input?.customer_phone?.trim() || null,
    title,
    description: input?.description?.trim() || null,
    quantity,
    total,
    payment_status: paymentStatus,
    status,
    internal_notes: input?.internal_notes?.trim() || null,
    created_by: auth.user.id,
  }).select('*, user:users!manual_orders_user_id_fkey(id, email, name)').single();

  if (error || !data) return serverError('Erro ao registrar encomenda externa. Aplique a migration mais recente no Supabase.');

  let inviteSent = false;
  if (!linkedUser && input?.send_invite) {
    inviteSent = await sendManualOrderInviteEmail({
      email: customerEmail,
      customerName,
      orderTitle: title,
      manualOrderId: data.id,
    });
    if (inviteSent) {
      const inviteSentAt = new Date().toISOString();
      await admin.from('manual_orders').update({ invite_sent_at: inviteSentAt }).eq('id', data.id);
      data.invite_sent_at = inviteSentAt;
    }
  }

  return NextResponse.json({ order: data, invite_sent: inviteSent }, { status: 201 });
}
