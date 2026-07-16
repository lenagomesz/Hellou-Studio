import { randomUUID } from 'crypto';
import type { CreateEmailOptions, CreateEmailResponse, Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';
import { captureOperationalError, structuredLog } from '@/lib/observability';
import { forceLightEmailHtml } from '@/lib/email-html';

export type TransactionalEmailType =
  | 'welcome'
  | 'partner_welcome'
  | 'password_reset'
  | 'print_request_status'
  | 'order_confirmation'
  | 'pix_payment'
  | 'order_status'
  | 'admin_new_order'
  | 'invoice_request'
  | 'admin_new_print_request'
  | 'stl_order_confirmation'
  | 'stl_admin_notification'
  | 'stl_delivery'
  | 'campaign'
  | 'abandoned_cart'
  | 'analytics_report';

export interface EmailDeliveryContext {
  emailType: TransactionalEmailType;
  orderId?: string;
  printRequestId?: string;
  campaignId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

function maskEmail(value: string) {
  const [local = '', domain = ''] = value.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
}

function getPrimaryRecipient(to: string | string[]) {
  return Array.isArray(to) ? to[0] ?? '' : to;
}

function safeProviderError(error: unknown) {
  if (!error || typeof error !== 'object') return { code: 'unknown', message: 'Falha desconhecida no provedor.' };
  const candidate = error as { name?: string; message?: string; statusCode?: number };
  return {
    code: candidate.name ?? (candidate.statusCode ? String(candidate.statusCode) : 'provider_error'),
    message: candidate.message?.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email-redacted]').slice(0, 400)
      ?? 'Falha ao enviar e-mail.',
  };
}

async function wait(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function updateDeliveryLog(logId: string | null, values: Record<string, unknown>) {
  if (!logId) return;
  try {
    await getSupabaseAdmin().from('email_delivery_logs').update(values).eq('id', logId);
  } catch (error) {
    structuredLog('warn', 'email.history_update_failed', { logId, error });
  }
}

export async function sendTrackedEmail(
  resend: Resend,
  payload: CreateEmailOptions,
  context: EmailDeliveryContext,
): Promise<CreateEmailResponse> {
  const lightPayload: CreateEmailOptions = typeof payload.html === 'string'
    ? { ...payload, html: forceLightEmailHtml(payload.html) }
    : payload;
  const recipient = getPrimaryRecipient(payload.to);
  const idempotencyKey = `hellou-${context.emailType}-${randomUUID()}`;
  let logId: string | null = null;

  try {
    const { data } = await getSupabaseAdmin()
      .from('email_delivery_logs')
      .insert({
        idempotency_key: idempotencyKey,
        email_type: context.emailType,
        recipient_masked: maskEmail(recipient),
        subject: payload.subject,
        status: 'sending',
        order_id: context.orderId ?? null,
        print_request_id: context.printRequestId ?? null,
        campaign_id: context.campaignId ?? null,
        metadata: context.metadata ?? {},
      })
      .select('id')
      .single();
    logId = data?.id ?? null;
  } catch (error) {
    structuredLog('warn', 'email.history_unavailable', { emailType: context.emailType, error });
  }

  let lastResponse: CreateEmailResponse | null = null;
  let lastThrown: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await resend.emails.send(lightPayload, { idempotencyKey });
      lastResponse = response;
      if (!response.error && response.data?.id) {
        await updateDeliveryLog(logId, {
          provider_email_id: response.data.id,
          status: 'sent',
          attempt_count: attempt,
          sent_at: new Date().toISOString(),
          last_event_at: new Date().toISOString(),
          last_error_code: null,
          last_error_message: null,
        });
        structuredLog('info', 'email.sent', {
          emailType: context.emailType,
          orderId: context.orderId,
          providerEmailId: response.data.id,
          attempt,
        });
        return response;
      }
      lastThrown = response.error;
    } catch (error) {
      lastThrown = error;
    }

    if (attempt < 3) await wait(attempt * 300);
  }

  const providerError = safeProviderError(lastThrown ?? lastResponse?.error);
  await updateDeliveryLog(logId, {
    status: 'failed',
    attempt_count: 3,
    failed_at: new Date().toISOString(),
    last_event_at: new Date().toISOString(),
    last_error_code: providerError.code,
    last_error_message: providerError.message,
  });

  await captureOperationalError({
    fingerprint: `email-send-${context.emailType}`,
    category: 'email.send_failed',
    title: 'E-mail não enviado após três tentativas',
    error: new Error(providerError.message),
    severity: context.orderId ? 'critical' : 'error',
    orderId: context.orderId,
    printRequestId: context.printRequestId,
    metadata: { emailType: context.emailType, providerCode: providerError.code },
    alert: true,
  });

  return lastResponse ?? ({
    data: null,
    error: { name: providerError.code, message: providerError.message, statusCode: 500 },
  } as CreateEmailResponse);
}
