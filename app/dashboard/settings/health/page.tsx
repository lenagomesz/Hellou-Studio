'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, Bug, CheckCircle2, Clock3, CreditCard, Database, Mail, RefreshCw, Server, XCircle } from 'lucide-react';

type Service = { service: string; status: 'healthy' | 'degraded' | 'down' | 'unknown'; latencyMs?: number; configured?: boolean; summary?: string; action?: string; missing?: string[] };
type CronRun = { id: string; cron_name: string; status: string; started_at: string; duration_ms?: number | null; processed_count: number };
type Health = {
  checkedAt: string;
  services: Service[];
  email24h: { total: number; failed: number; counts: Record<string, number> };
  openErrors: number;
  cronRuns: CronRun[];
};
type OperationalError = {
  id: string;
  category: string;
  severity: 'warning' | 'error' | 'critical';
  title: string;
  safe_message: string | null;
  occurrence_count: number;
  last_seen_at: string;
  resolved_at: string | null;
};

const SERVICE_LABELS: Record<string, string> = {
  database: 'Banco de dados', resend: 'Resend e webhook', sentry: 'Sentry', mercado_pago: 'Mercado Pago', crons: 'Rotinas automáticas',
};
const STATUS_LABELS: Record<string, string> = { healthy: 'Saudável', degraded: 'Atenção', down: 'Indisponível', unknown: 'Desconhecido' };
const SERVICE_ICONS = { database: Database, crons: Clock3, resend: Mail, sentry: Bug, mercado_pago: CreditCard } as const;
const CRON_DETAILS: Record<string, { label: string; description: string; singular: string; plural: string }> = {
  'recover-abandoned-carts': {
    label: 'Recuperação de carrinhos abandonados',
    description: 'Procura carrinhos deixados para trás e envia um lembrete quando o cliente autorizou comunicações.',
    singular: 'carrinho processado',
    plural: 'carrinhos processados',
  },
  'admin-reminders': {
    label: 'Lembretes administrativos',
    description: 'Avisa sobre pedidos atrasados, encomendas pendentes, envios e produtos com estoque baixo.',
    singular: 'lembrete criado',
    plural: 'lembretes criados',
  },
  'cancel-expired-pix': {
    label: 'Cancelamento de PIX expirados',
    description: 'Confere pagamentos PIX vencidos e cancela somente os pedidos que continuam sem pagamento.',
    singular: 'pedido cancelado',
    plural: 'pedidos cancelados',
  },
  'cleanup-encomendas': {
    label: 'Limpeza de produtos temporários',
    description: 'Exclui produtos exclusivos de encomendas entregues há mais de 60 dias, mantendo o histórico da solicitação.',
    singular: 'produto temporário removido',
    plural: 'produtos temporários removidos',
  },
};
const CRON_STATUS_LABELS: Record<string, string> = { success: 'Concluída', failed: 'Falhou', running: 'Em execução' };
const CRON_ENDPOINTS: Record<string, string> = {
  'recover-abandoned-carts': '/api/cron/recover-abandoned-carts',
  'admin-reminders': '/api/cron/admin-reminders',
  'cancel-expired-pix': '/api/cron/cancel-expired-pix',
  'cleanup-encomendas': '/api/cron/cleanup-encomendas',
};

export default function ServiceHealthPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [errors, setErrors] = useState<OperationalError[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCron, setRunningCron] = useState<string | null>(null);
  const [cronFeedback, setCronFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [healthResponse, errorsResponse] = await Promise.all([
        fetch('/api/admin/observability/health', { cache: 'no-store' }),
        fetch('/api/admin/observability/errors', { cache: 'no-store' }),
      ]);
      if (healthResponse.ok) setHealth(await healthResponse.json());
      if (errorsResponse.ok) setErrors((await errorsResponse.json()).errors ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function resolveError(id: string, resolved: boolean) {
    const response = await fetch('/api/admin/observability/errors', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, resolved }),
    });
    if (response.ok) await load();
  }

  async function runCron(cronName: string) {
    const endpoint = CRON_ENDPOINTS[cronName];
    if (!endpoint) return;
    setRunningCron(cronName);
    setCronFeedback(null);
    try {
      const response = await fetch(endpoint, { method: 'POST' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Não foi possível executar a rotina.');
      }
      setCronFeedback('Rotina executada com sucesso.');
      await load();
    } catch (error) {
      setCronFeedback(error instanceof Error ? error.message : 'Não foi possível executar a rotina.');
    } finally {
      setRunningCron(null);
    }
  }

  const latestCronByName = Array.from(new Map((health?.cronRuns ?? []).map((run) => [run.cron_name, run])).values());
  const openErrors = errors.filter((error) => !error.resolved_at);
  const services = health?.services ?? [];
  const healthyServices = services.filter((service) => service.status === 'healthy').length;
  const attentionServices = services.filter((service) => service.status !== 'healthy').length;
  const healthScore = services.length ? Math.round((healthyServices / services.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f5f6f8] p-4 text-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-6 bg-gradient-to-br from-white via-pink-50 to-orange-50 p-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-pink-600 shadow-sm"><Activity className="h-3.5 w-3.5" /> Observabilidade</span>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Saúde dos serviços</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Veja o que está funcionando e, quando houver atenção, a causa exata e como resolver. Nenhum dado sensível dos clientes é exibido.</p>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <div className="flex items-center gap-4 rounded-2xl border border-white bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
                <div className="relative grid h-14 w-14 place-items-center rounded-full" style={{ background: `conic-gradient(#10b981 ${healthScore * 3.6}deg, #e2e8f0 0deg)` }}><span className="grid h-11 w-11 place-items-center rounded-full bg-white text-xs font-black text-slate-900">{healthScore}%</span></div>
                <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Visão geral</p><p className="mt-0.5 text-sm font-black text-slate-900">{healthyServices} de {services.length || 5} saudáveis</p><p className="text-xs text-slate-500">{attentionServices ? `${attentionServices} item(ns) para revisar` : 'Tudo funcionando'}</p></div>
              </div>
              <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-pink-600 disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar agora
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {services.map((service) => {
            const healthy = service.status === 'healthy';
            const ServiceIcon = SERVICE_ICONS[service.service as keyof typeof SERVICE_ICONS] ?? Server;
            const statusLabel = service.configured === false && service.status !== 'down'
              ? 'Configuração pendente'
              : STATUS_LABELS[service.status];
            return (
              <article key={service.service} className={`flex min-h-64 flex-col rounded-2xl border bg-white p-5 shadow-sm ${healthy ? 'border-slate-200' : service.status === 'down' ? 'border-red-200' : 'border-amber-200'}`}>
                <div className="flex items-center justify-between">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${healthy ? 'bg-emerald-50 text-emerald-600' : service.status === 'down' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}><ServiceIcon className="h-5 w-5" /></span>
                  {healthy ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : service.status === 'down' ? <XCircle className="h-5 w-5 text-red-500" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}
                </div>
                <h2 className="mt-4 text-sm font-extrabold">{SERVICE_LABELS[service.service] ?? service.service}</h2>
                <p className={`mt-1 text-xs font-bold ${healthy ? 'text-emerald-600' : service.status === 'down' ? 'text-red-600' : 'text-amber-600'}`}>{statusLabel}</p>
                {service.latencyMs != null && <p className="mt-2 text-xs text-slate-500">Resposta em {service.latencyMs} ms</p>}
                <p className="mt-3 text-xs leading-5 text-slate-600">{service.summary ?? 'Verificação ainda sem detalhes.'}</p>
                {service.action && <div className={`mt-auto rounded-xl p-3 text-[11px] font-semibold leading-4 ${service.status === 'down' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}><span className="block font-black">Como resolver</span>{service.action}</div>}
              </article>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Mail className="h-6 w-6 text-pink-600" /><p className="mt-4 text-3xl font-black">{health?.email24h.total ?? 0}</p><p className="text-sm font-bold text-slate-700">e-mails nas últimas 24 horas</p><p className="mt-2 text-xs text-slate-500">{health?.email24h.failed ?? 0} não entregues ou rejeitados</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <AlertTriangle className="h-6 w-6 text-amber-500" /><p className="mt-4 text-3xl font-black">{openErrors.length}</p><p className="text-sm font-bold text-slate-700">ocorrências abertas</p><p className="mt-2 text-xs text-slate-500">Falhas iguais são agrupadas automaticamente.</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Clock3 className="h-6 w-6 text-violet-600" /><p className="mt-4 text-3xl font-black">{latestCronByName.length}</p><p className="text-sm font-bold text-slate-700">tarefas automáticas monitoradas</p><p className="mt-2 text-xs text-slate-500">Última execução de cada rotina.</p>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5"><h2 className="font-black">Histórico de erros</h2><p className="mt-1 text-xs text-slate-500">Somente mensagens higienizadas, sem CPF, e-mail ou payload completo.</p></div>
            <div className="divide-y divide-slate-100">
              {errors.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Nenhum erro registrado.</p>}
              {errors.slice(0, 20).map((error) => (
                <article key={error.id} className={`p-5 ${error.resolved_at ? 'opacity-55' : ''}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${error.severity === 'critical' ? 'bg-red-100 text-red-700' : error.severity === 'error' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>{error.severity}</span><h3 className="mt-3 text-sm font-extrabold">{error.title}</h3><p className="mt-1 text-xs text-slate-500">{error.safe_message ?? error.category} · {error.occurrence_count} ocorrência(s) · {new Date(error.last_seen_at).toLocaleString('pt-BR')}</p></div>
                    <button type="button" onClick={() => void resolveError(error.id, Boolean(error.resolved_at))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50">{error.resolved_at ? 'Reabrir' : 'Marcar resolvido'}</button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="font-black">Rotinas automáticas</h2>
              <p className="mt-1 text-xs text-slate-500">Tarefas que a loja executa sozinha para manter pedidos, alertas e carrinhos organizados.</p>
              {cronFeedback && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">{cronFeedback}</p>}
            </div>
            <div className="divide-y divide-slate-100">
              {Object.entries(CRON_DETAILS).map(([cronName, details]) => {
                const run = latestCronByName.find((item) => item.cron_name === cronName);
                const isRunning = runningCron === cronName;
                return (
                  <div key={cronName} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-sm font-extrabold text-slate-900">{details.label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{details.description}</p></div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${run?.status === 'success' ? 'bg-emerald-100 text-emerald-700' : run?.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{run ? (CRON_STATUS_LABELS[run.status] ?? run.status) : 'Nunca executada'}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold text-slate-400">{run ? <>Última execução: {new Date(run.started_at).toLocaleString('pt-BR')} · {run.processed_count} {run.processed_count === 1 ? details.singular : details.plural}</> : 'Nenhuma execução registrada.'}</p>
                      <button type="button" onClick={() => void runCron(cronName)} disabled={runningCron !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700 disabled:cursor-not-allowed disabled:opacity-50">
                        <RefreshCw className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                        {isRunning ? 'Executando...' : 'Executar agora'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
