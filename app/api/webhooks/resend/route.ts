import { NextResponse } from 'next/server';
import { Resend, type WebhookEventPayload } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';
import { captureOperationalError, structuredLog } from '@/lib/observability';

const STATUS_BY_EVENT: Record<string, string> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delayed',
  'email.failed': 'failed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.suppressed': 'suppressed',
};

const FAILURE_EVENTS = new Set([
  'email.failed',
  'email.bounced',
  'email.complained',
  'email.suppressed',
]);

function isEmailEvent(event: WebhookEventPayload): event is Extract<WebhookEventPayload, { type: `email.${string}` }> {
  return event.type.startsWith('email.') && 'email_id' in event.data;
}

function getSafeDetails(event: Extract<WebhookEventPayload, { type: `email.${string}` }>) {
  if (event.type === 'email.bounced') {
    return { type: event.data.bounce.type, subtype: event.data.bounce.subType };
  }
  if (event.type === 'email.failed') return { reason: event.data.failed.reason.slice(0, 300) };
  if (event.type === 'email.suppressed') return { type: event.data.suppressed.type };
  return {};
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    structuredLog('error', 'resend.webhook_not_configured');
    return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 503 });
  }

  const rawBody = await request.text();
  const webhookId = request.headers.get('svix-id');
  const webhookTimestamp = request.headers.get('svix-timestamp');
  const webhookSignature = request.headers.get('svix-signature');

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    await captureOperationalError({
      fingerprint: 'resend-webhook-missing-signature',
      category: 'webhook.rejected',
      title: 'Webhook da Resend rejeitado',
      error: new Error('Cabeçalhos de assinatura ausentes.'),
      route: '/api/webhooks/resend',
      severity: 'warning',
      alert: true,
    });
    return NextResponse.json({ error: 'Assinatura ausente.' }, { status: 400 });
  }

  let event: WebhookEventPayload;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY ?? 're_webhook_verification');
    event = resend.webhooks.verify({
      payload: rawBody,
      headers: {
        id: webhookId,
        timestamp: webhookTimestamp,
        signature: webhookSignature,
      },
      webhookSecret,
    });
  } catch (error) {
    await captureOperationalError({
      fingerprint: 'resend-webhook-invalid-signature',
      category: 'webhook.rejected',
      title: 'Webhook da Resend com assinatura inválida',
      error,
      route: '/api/webhooks/resend',
      severity: 'warning',
      alert: true,
    });
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 400 });
  }

  if (!isEmailEvent(event)) return NextResponse.json({ received: true });

  const admin = getSupabaseAdmin();
  const providerEmailId = event.data.email_id;
  const { data: log } = await admin
    .from('email_delivery_logs')
    .select('id, order_id, print_request_id, last_event_at')
    .eq('provider_email_id', providerEmailId)
    .maybeSingle();

  const { error: eventError } = await admin.from('email_delivery_events').insert({
    webhook_event_id: webhookId,
    email_log_id: log?.id ?? null,
    provider_email_id: providerEmailId,
    event_type: event.type,
    event_created_at: event.created_at,
    safe_details: getSafeDetails(event),
  });

  if (eventError?.code === '23505') return NextResponse.json({ received: true, duplicate: true });
  if (eventError) throw eventError;

  const nextStatus = STATUS_BY_EVENT[event.type];
  const incomingTime = new Date(event.created_at).getTime();
  const lastEventTime = log?.last_event_at ? new Date(log.last_event_at).getTime() : 0;

  if (log?.id && nextStatus && incomingTime >= lastEventTime) {
    await admin
      .from('email_delivery_logs')
      .update({
        status: nextStatus,
        last_event_at: event.created_at,
        delivered_at: nextStatus === 'delivered' ? event.created_at : undefined,
        failed_at: FAILURE_EVENTS.has(event.type) ? event.created_at : undefined,
      })
      .eq('id', log.id);
  }

  if (FAILURE_EVENTS.has(event.type)) {
    await captureOperationalError({
      fingerprint: `resend-delivery-${event.type}-${providerEmailId}`,
      category: 'email.not_delivered',
      title: 'E-mail não entregue ao destinatário',
      error: new Error(`A Resend informou o evento ${event.type}.`),
      severity: log?.order_id ? 'critical' : 'error',
      orderId: log?.order_id ?? undefined,
      printRequestId: log?.print_request_id ?? undefined,
      metadata: { eventType: event.type, providerEmailId, ...getSafeDetails(event) },
      alert: true,
    });
  }

  structuredLog('info', 'resend.webhook_processed', { eventType: event.type, providerEmailId });
  return NextResponse.json({ received: true });
}
