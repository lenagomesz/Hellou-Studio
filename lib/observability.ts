import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createAdminAlert } from '@/lib/admin-alerts';

type LogLevel = 'info' | 'warn' | 'error';
type OperationalSeverity = 'warning' | 'error' | 'critical';
type SafeRecord = Record<string, unknown>;

const SENSITIVE_KEY = /(email|cpf|password|token|secret|authorization|cookie|payload|body|address|pix|card)/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

function sanitizeString(value: string) {
  return value
    .replace(EMAIL_PATTERN, '[email-redacted]')
    .replace(CPF_PATTERN, '[cpf-redacted]')
    .slice(0, 500);
}

export function sanitizeOperationalData(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[max-depth]';
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return sanitizeString(value);
  if (value instanceof Error) {
    return { name: value.name, message: sanitizeString(value.message) };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeOperationalData(item, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as SafeRecord).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? '[redacted]' : sanitizeOperationalData(item, depth + 1),
      ]),
    );
  }
  return String(value);
}

export function structuredLog(level: LogLevel, event: string, data: SafeRecord = {}) {
  const isTestRun = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
  if (isTestRun && process.env.TEST_VERBOSE_LOGS !== 'true') return;
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    data: sanitizeOperationalData(data),
  });
  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else console.info(entry);
}

export async function captureOperationalError(params: {
  fingerprint: string;
  category: string;
  title: string;
  error?: unknown;
  severity?: OperationalSeverity;
  route?: string;
  orderId?: string;
  printRequestId?: string;
  metadata?: SafeRecord;
  alert?: boolean;
}) {
  const severity = params.severity ?? 'error';
  const safeError = sanitizeOperationalData(params.error);
  const safeMetadata = sanitizeOperationalData(params.metadata ?? {}) as SafeRecord;
  const safeMessage = params.error instanceof Error
    ? sanitizeString(params.error.message)
    : typeof params.error === 'string'
      ? sanitizeString(params.error)
      : null;

  structuredLog(severity === 'warning' ? 'warn' : 'error', params.category, {
    fingerprint: params.fingerprint,
    title: params.title,
    route: params.route,
    orderId: params.orderId,
    error: safeError,
    metadata: safeMetadata,
  });

  Sentry.withScope((scope) => {
    scope.setLevel(severity === 'warning' ? 'warning' : severity === 'critical' ? 'fatal' : 'error');
    scope.setTag('operational.category', params.category);
    scope.setTag('operational.fingerprint', params.fingerprint);
    if (params.orderId) scope.setTag('order.id', params.orderId);
    scope.setContext('operational', safeMetadata);
    if (params.error instanceof Error) Sentry.captureException(params.error);
    else Sentry.captureMessage(params.title);
  });

  let existingLastSeen = 0;
  let hadExistingRecord = false;

  try {
    const admin = getSupabaseAdmin();
    const { data: existing } = await admin
      .from('operational_errors')
      .select('id, occurrence_count, last_seen_at')
      .eq('fingerprint', params.fingerprint)
      .maybeSingle();

    const record = {
      category: params.category,
      severity,
      title: params.title,
      safe_message: safeMessage,
      route: params.route ?? null,
      order_id: params.orderId ?? null,
      print_request_id: params.printRequestId ?? null,
      last_seen_at: new Date().toISOString(),
      resolved_at: null,
      metadata: safeMetadata,
    };

    if (existing) {
      hadExistingRecord = true;
      existingLastSeen = typeof existing.last_seen_at === 'string'
        ? new Date(existing.last_seen_at).getTime()
        : 0;
      await admin
        .from('operational_errors')
        .update({ ...record, occurrence_count: existing.occurrence_count + 1 })
        .eq('id', existing.id);
    } else {
      await admin.from('operational_errors').insert({
        ...record,
        fingerprint: params.fingerprint,
        first_seen_at: new Date().toISOString(),
      });
    }
  } catch (storageError) {
    structuredLog('warn', 'observability.storage_failed', { error: storageError });
  }

  const shouldAlert = !hadExistingRecord || Date.now() - existingLastSeen > 60 * 60 * 1000;

  if (params.alert && shouldAlert) {
    try {
      await createAdminAlert({
        type: 'custom',
        title: params.title,
        body: safeMessage ?? 'Consulte a página de saúde para mais detalhes.',
        priority: severity === 'critical' ? 'urgent' : 'high',
        related_order_id: params.orderId,
        related_print_request_id: params.printRequestId,
      });
    } catch (alertError) {
      structuredLog('warn', 'observability.alert_failed', { error: alertError });
    }
  }
}

export async function recordServiceHealth(params: {
  service: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  latencyMs?: number;
  message?: string;
  metadata?: SafeRecord;
}) {
  try {
    await getSupabaseAdmin().from('service_health_checks').insert({
      service: params.service,
      status: params.status,
      latency_ms: params.latencyMs ?? null,
      safe_message: params.message ? sanitizeString(params.message) : null,
      metadata: sanitizeOperationalData(params.metadata ?? {}),
    });
  } catch (error) {
    structuredLog('warn', 'health.storage_failed', { service: params.service, error });
  }
}

export async function startCronRun(cronName: string) {
  const startedAt = Date.now();
  try {
    const { data } = await getSupabaseAdmin()
      .from('cron_runs')
      .insert({ cron_name: cronName, status: 'running' })
      .select('id')
      .single();
    return { id: data?.id as string | undefined, startedAt };
  } catch {
    return { id: undefined, startedAt };
  }
}

export async function finishCronRun(
  run: { id?: string; startedAt: number },
  params: { status: 'success' | 'failed'; processedCount?: number; error?: unknown },
) {
  if (!run.id) return;
  await getSupabaseAdmin()
    .from('cron_runs')
    .update({
      status: params.status,
      processed_count: params.processedCount ?? 0,
      duration_ms: Date.now() - run.startedAt,
      safe_error: params.error instanceof Error ? sanitizeString(params.error.message) : null,
      finished_at: new Date().toISOString(),
    })
    .eq('id', run.id);
}
