import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { recordServiceHealth } from '@/lib/observability';
import { getCronHealth, getIntegrationHealth } from '@/lib/service-health';

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

  const latestCronRuns = Array.from(new Map((cronResult.data ?? []).map((run) => [run.cron_name, run])).values());
  const cronHealth = cronResult.error
    ? { status: 'down' as const, summary: 'O histórico das rotinas não pôde ser consultado.', action: 'Verifique a migration de observabilidade.', missing: [], failed: [], stale: [] }
    : getCronHealth({ runs: latestCronRuns, hasSecret: Boolean(process.env.CRON_SECRET) });
  const integrations = getIntegrationHealth(process.env);

  await Promise.all([
    recordServiceHealth({
      service: 'crons',
      status: cronHealth.status,
      message: cronHealth.summary,
      metadata: { monitoredRoutines: latestCronRuns.length, missing: cronHealth.missing.length, failed: cronHealth.failed.length, stale: cronHealth.stale.length },
    }),
    ...integrations.map((integration) => recordServiceHealth({
      service: integration.service,
      status: integration.status,
      message: integration.summary,
      metadata: { configured: integration.configured, missingCount: integration.missing.length },
    })),
  ]);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    services: [
      {
        service: 'database',
        status: databaseStatus,
        latencyMs: databaseLatency,
        configured: true,
        summary: databaseError
          ? 'Não foi possível consultar o banco de dados.'
          : databaseStatus === 'degraded'
            ? 'O banco respondeu, mas acima do tempo esperado.'
            : 'Conexão e consulta funcionando normalmente.',
        action: databaseError ? 'Confira as credenciais e a disponibilidade do Supabase.' : undefined,
      },
      { service: 'crons', configured: Boolean(process.env.CRON_SECRET), ...cronHealth },
      ...integrations,
    ],
    email24h: { total: emailResult.data?.length ?? 0, failed: failedEmails, counts: emailCounts },
    openErrors: errorsResult.count ?? errorsResult.data?.length ?? 0,
    cronRuns: cronResult.data ?? [],
  });
}
