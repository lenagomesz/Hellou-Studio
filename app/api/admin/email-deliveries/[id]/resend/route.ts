import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requirePermission } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendTrackedEmail, type TransactionalEmailType } from '@/lib/email-delivery';
import { captureOperationalError } from '@/lib/observability';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requirePermission('orders.manage');
  if (auth.response) return auth.response;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Resend não configurada.' }, { status: 503 });

  const { id } = await context.params;
  const admin = getSupabaseAdmin();
  const { data: log } = await admin
    .from('email_delivery_logs')
    .select('id, email_type, provider_email_id, order_id, print_request_id, campaign_id')
    .eq('id', id)
    .single();

  if (!log) return NextResponse.json({ error: 'Envio não encontrado.' }, { status: 404 });
  if (!log.provider_email_id) {
    return NextResponse.json({ error: 'Este envio falhou antes de chegar à Resend e não pode ser reconstruído com segurança.' }, { status: 409 });
  }

  try {
    const resend = new Resend(apiKey);
    const original = await resend.emails.get(log.provider_email_id);
    if (original.error || !original.data) throw original.error ?? new Error('Conteúdo original indisponível.');
    if (!original.data.html && !original.data.text) throw new Error('A Resend não retornou o conteúdo original.');

    const response = await sendTrackedEmail(resend, {
      from: original.data.from,
      to: original.data.to,
      subject: original.data.subject,
      ...(original.data.html ? { html: original.data.html } : { text: original.data.text ?? '' }),
      ...(original.data.cc?.length ? { cc: original.data.cc } : {}),
      ...(original.data.bcc?.length ? { bcc: original.data.bcc } : {}),
      ...(original.data.reply_to?.length ? { replyTo: original.data.reply_to } : {}),
    }, {
      emailType: log.email_type as TransactionalEmailType,
      orderId: log.order_id ?? undefined,
      printRequestId: log.print_request_id ?? undefined,
      campaignId: log.campaign_id ?? undefined,
      metadata: { resentFrom: log.id, resentByAdmin: true },
    });

    if (response.error) return NextResponse.json({ error: 'A nova tentativa também falhou.' }, { status: 502 });
    return NextResponse.json({ success: true, providerEmailId: response.data?.id });
  } catch (error) {
    await captureOperationalError({
      fingerprint: `email-admin-resend-${id}`,
      category: 'email.resend_failed',
      title: 'Falha ao reenviar e-mail pelo painel',
      error,
      orderId: log.order_id ?? undefined,
      printRequestId: log.print_request_id ?? undefined,
      alert: true,
    });
    return NextResponse.json({ error: 'Não foi possível reenviar este e-mail.' }, { status: 502 });
  }
}
