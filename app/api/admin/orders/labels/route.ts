import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin, badRequest } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createTimelineEvent } from '@/lib/order-management';

const SENDER_ADDRESS = {
  name: 'helloustudio',
  street: 'Rua Sao Paulo',
  number: '250',
  neighborhood: 'Sao Judas',
  city: 'Itajai',
  state: 'SC',
  cep: '88303-330',
  country: 'BR',
};

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const orderId = req.nextUrl.searchParams.get('orderId');
  if (!orderId) return badRequest('orderId obrigatório');

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('shipping_labels')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar etiquetas' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = await req.json();
  const { orderIds, serviceType = 'sedex' } = body as {
    orderIds: string[];
    serviceType?: string;
  };

  if (!orderIds || orderIds.length === 0) {
    return badRequest('Selecione pelo menos um pedido');
  }

  const admin = getSupabaseAdmin();
  const adminName = auth.user.name ?? auth.user.email;
  const labels = [];
  const errors: string[] = [];

  for (const orderId of orderIds) {
    // Get order with shipping info
    const { data: order, error: fetchError } = await admin
      .from('orders')
      .select('id, shipping_address, user:users(id, name, email)')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      errors.push(orderId);
      continue;
    }

    const shipping = order.shipping_address as Record<string, unknown> | null;
    const user = order.user as unknown as { id: string; name: string | null; email: string } | null;

    if (!shipping || !shipping.cep) {
      errors.push(orderId);
      continue;
    }

    const recipientAddress = {
      name: user?.name ?? '',
      street: String(shipping.street ?? ''),
      number: String(shipping.number ?? ''),
      complement: String(shipping.complement ?? ''),
      neighborhood: String(shipping.neighborhood ?? ''),
      city: String(shipping.city ?? ''),
      state: String(shipping.state ?? ''),
      cep: String(shipping.cep ?? ''),
      country: 'BR',
    };

    const { data: label, error: insertError } = await admin
      .from('shipping_labels')
      .insert({
        order_id: orderId,
        carrier: 'correios',
        service_type: serviceType,
        sender_address: SENDER_ADDRESS,
        recipient_address: recipientAddress,
        status: 'generated',
      })
      .select()
      .single();

    if (insertError) {
      errors.push(orderId);
      continue;
    }

    labels.push(label);

    await createTimelineEvent({
      orderId,
      status: 'label_generated',
      changedBy: auth.user.id,
      changedByName: adminName,
      message: `Etiqueta de envio gerada (${serviceType.toUpperCase()})`,
      metadata: { label_id: label.id, service_type: serviceType },
    });
  }

  return NextResponse.json({
    success: true,
    labels,
    summary: {
      total: orderIds.length,
      generated: labels.length,
      failed: errors.length,
    },
    errors,
    senderAddress: SENDER_ADDRESS,
    message: `${labels.length} etiquetas geradas`,
  });
}
