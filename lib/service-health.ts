export type ServiceHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export type IntegrationHealth = {
  service: 'resend' | 'sentry' | 'mercado_pago';
  status: ServiceHealthStatus;
  configured: boolean;
  summary: string;
  action?: string;
  missing: string[];
};

export function getIntegrationHealth(env: Readonly<Record<string, string | undefined>>): IntegrationHealth[] {
  const resendMissing = [
    !env.RESEND_API_KEY && 'RESEND_API_KEY',
    !env.RESEND_WEBHOOK_SECRET && 'RESEND_WEBHOOK_SECRET',
  ].filter((value): value is string => Boolean(value));

  const sentryMissing = [
    !(env.SENTRY_DSN || env.NEXT_PUBLIC_SENTRY_DSN) && 'SENTRY_DSN',
  ].filter((value): value is string => Boolean(value));

  const mercadoPagoMissing = [
    !env.MERCADO_PAGO_ACCESS_TOKEN && 'MERCADO_PAGO_ACCESS_TOKEN',
    !env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY && 'NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY',
    !env.MERCADO_PAGO_WEBHOOK_SECRET && 'MERCADO_PAGO_WEBHOOK_SECRET',
  ].filter((value): value is string => Boolean(value));

  return [
    {
      service: 'resend',
      configured: resendMissing.length === 0,
      status: resendMissing.length === 0 ? 'healthy' : 'degraded',
      summary: resendMissing.length === 0
        ? 'Envio e retorno de entrega configurados.'
        : !env.RESEND_API_KEY
          ? 'O provedor de e-mail ainda não está configurado.'
          : 'Os e-mails são enviados, mas entregas e rejeições não retornam ao painel.',
      action: resendMissing.length ? `Configure ${resendMissing.join(' e ')} na Vercel.` : undefined,
      missing: resendMissing,
    },
    {
      service: 'sentry',
      configured: sentryMissing.length === 0,
      status: sentryMissing.length === 0 ? 'healthy' : 'degraded',
      summary: sentryMissing.length === 0 ? 'Captura segura de erros ativada.' : 'Erros da aplicação não estão sendo enviados ao Sentry.',
      action: sentryMissing.length ? 'Configure SENTRY_DSN ou NEXT_PUBLIC_SENTRY_DSN na Vercel.' : undefined,
      missing: sentryMissing,
    },
    {
      service: 'mercado_pago',
      configured: mercadoPagoMissing.length === 0,
      status: !env.MERCADO_PAGO_ACCESS_TOKEN ? 'down' : mercadoPagoMissing.length ? 'degraded' : 'healthy',
      summary: mercadoPagoMissing.length === 0
        ? 'Pagamento e webhook configurados.'
        : !env.MERCADO_PAGO_ACCESS_TOKEN
          ? 'A credencial privada de pagamentos não foi encontrada.'
          : 'O pagamento está disponível, mas a configuração está incompleta.',
      action: mercadoPagoMissing.length ? `Configure ${mercadoPagoMissing.join(', ')} na Vercel.` : undefined,
      missing: mercadoPagoMissing,
    },
  ];
}

export function getCronHealth(params: {
  runs: Array<{ cron_name: string; status: string; started_at: string }>;
  now?: number;
  hasSecret: boolean;
}) {
  const expectedHours: Record<string, number> = {
    'cancel-expired-pix': 26,
    'admin-reminders': 26,
    'recover-abandoned-carts': 26,
    'cleanup-encomendas': 8 * 24,
  };
  const routineLabels: Record<string, string> = {
    'cancel-expired-pix': 'cancelamento de PIX expirados',
    'admin-reminders': 'lembretes administrativos',
    'recover-abandoned-carts': 'recuperação de carrinhos abandonados',
    'cleanup-encomendas': 'limpeza de produtos temporários de encomendas',
  };
  const readableNames = (names: string[]) => names.map((name) => routineLabels[name] ?? name).join(', ');
  const now = params.now ?? Date.now();
  const latestByName = new Map(params.runs.map((run) => [run.cron_name, run]));
  const missing = Object.keys(expectedHours).filter((name) => !latestByName.has(name));
  const failed = [...latestByName.values()].filter((run) => run.status === 'failed').map((run) => run.cron_name);
  const stale = [...latestByName.values()].filter((run) => {
    const limit = expectedHours[run.cron_name];
    return limit ? now - new Date(run.started_at).getTime() > limit * 60 * 60 * 1000 : false;
  }).map((run) => run.cron_name);

  const status: ServiceHealthStatus = failed.length || stale.length
    ? 'down'
    : !params.hasSecret || missing.length
      ? 'degraded'
      : 'healthy';
  const summary = !params.hasSecret
    ? 'A variável CRON_SECRET não está configurada.'
    : failed.length
      ? `Falha recente na rotina de ${readableNames(failed)}.`
      : stale.length
        ? `Execução atrasada: ${readableNames(stale)}.`
        : missing.length
          ? `Aguardando primeira execução de: ${readableNames(missing)}.`
          : 'Todas as rotinas executaram dentro do prazo.';

  return {
    status,
    summary,
    action: !params.hasSecret
      ? 'Configure CRON_SECRET na Vercel.'
      : missing.length
        ? 'Aguarde o próximo agendamento diário ou execute a rotina manualmente.'
        : failed.length || stale.length
          ? 'Abra o histórico abaixo para identificar a rotina com problema.'
          : undefined,
    missing,
    failed,
    stale,
  };
}
