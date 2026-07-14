import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { recordServiceHealth } from '@/lib/observability';

export async function GET() {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;
  const admin = getSupabaseAdmin();

  const startedAt = Date.now();
  const { error: databaseError } = await admin.from('users').select('id', { head: true, count: 'exact' }).limit(1);
  const databaseLatency = Date.now() - startedAt;
  const databaseStatus = databaseError ? 'down' : databaseLatency > 1500 ? 'degraded' : 'healthy';
  await recordServiceHealth({ service: 'database', status: databaseStatus, latencyMs: databaseLatency, message: databaseError?.message });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [emailResult, errorsResult, cronResult] = await Promise.all([
    admin.from('email_delivery_logs').select('status').gte('created_at', since),
    admin.from('operational_errors').select('id, severity', { count: 'exact' }).is('resolved_at', null),
    admin.from('cron_runs').select('*').order('started_at', { ascending: false }).limit(30),
  ]);

  const emailCounts = (emailResult.data ?? []).reduce<Record<string, number>>((counts, row) => {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    return counts;
  }, {});
  const failedEmails = ['failed', 'bounced', 'complained', 'suppressed']
    .reduce((total, status) => total + (emailCounts[status] ?? 0), 0);

  const configured = [
    { service: 'resend', configured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_WEBHOOK_SECRET) },
    { service: 'sentry', configured: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) },
    { service: 'mercado_pago', configured: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN) },
  ];
  const latestCronRuns = Array.from(new Map((cronResult.data ?? []).map((run) => [run.cron_name, run])).values());
  const expectedHours: Record<string, number> = {
    'cancel-expired-pix': 26,
    'admin-reminders': 26,
    'cleanup-encomendas': 8 * 24,
  };
  const cronHasFailure = latestCronRuns.some((run) => run.status === 'failed');
  const cronIsStale = latestCronRuns.some((run) => {
    const limit = expectedHours[run.cron_name];
    return limit ? Date.now() - new Date(run.started_at).getTime() > limit * 60 * 60 * 1000 : false;
  });
  const cronStatus = latestCronRuns.length === 0 ? 'degraded' : cronHasFailure || cronIsStale ? 'down' : 'healthy';
  await recordServiceHealth({ service: 'crons', status: cronStatus, metadata: { monitoredRoutines: latestCronRuns.length } });

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    services: [
      { service: 'database', status: databaseStatus, latencyMs: databaseLatency },
      { service: 'crons', status: cronStatus },
      ...configured.map((item) => ({ ...item, status: item.configured ? 'healthy' : 'degraded' })),
    ],
    email24h: { total: emailResult.data?.length ?? 0, failed: failedEmails, counts: emailCounts },
    openErrors: errorsResult.count ?? errorsResult.data?.length ?? 0,
    cronRuns: cronResult.data ?? [],
  });
}
