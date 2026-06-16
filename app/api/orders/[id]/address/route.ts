import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser, badRequest, notFound, serverError } from '@/lib/api';

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  const body = await req.json();
  const { street, number, complement, neighborhood, city, state, cep } = body as {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    cep?: string;
  };

  if (!street?.trim() || !number?.trim() || !neighborhood?.trim() || !cep?.trim()) {
    return badRequest('Preencha os campos obrigatórios: rua, número, bairro e CEP');
  }

  const admin = getSupabaseAdmin();

  const { data: order } = await admin
    .from('orders')
    .select('id, user_id, status, shipping_address')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .single();

  if (!order) return notFound('Pedido não encontrado');

  const editableStatuses = ['awaiting_payment', 'pending', 'paid', 'processing'];
  if (!editableStatuses.includes(order.status)) {
    return badRequest('Não é possível alterar o endereço após o envio');
  }

  const currentAddress = (order.shipping_address ?? {}) as Record<string, unknown>;
  const updatedAddress = {
    ...currentAddress,
    street: street.trim(),
    number: number.trim(),
    complement: complement?.trim() || '',
    neighborhood: neighborhood.trim(),
    city: city?.trim() || currentAddress.city || '',
    state: state?.trim() || currentAddress.state || '',
    cep: cep.trim(),
  };

  const { error } = await admin
    .from('orders')
    .update({ shipping_address: updatedAddress, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return serverError('Erro ao atualizar endereço');

  return NextResponse.json({ success: true, address: updatedAddress });
}
