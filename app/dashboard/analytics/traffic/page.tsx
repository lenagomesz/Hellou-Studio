'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  Eye,
  Globe2,
  Laptop,
  MousePointerClick,
  RefreshCw,
  Route,
  ShieldCheck,
  Smartphone,
  Tablet,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { TrafficSummary } from '@/lib/site-analytics';

type TrafficResponse = {
  periodDays: number;
  summary: TrafficSummary;
  privacy: { anonymousOnly: boolean; consentRequired: boolean; rawIpStored: boolean };
};

const DEVICE_LABELS: Record<string, string> = { desktop: 'Computador', mobile: 'Celular', tablet: 'Tablet', other: 'Outro' };

function Growth({ value }: { value: number }) {
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return <span className={`inline-flex items-center gap-1 text-xs font-bold ${positive ? 'text-emerald-600' : 'text-red-600'}`}><Icon className="h-3.5 w-3.5" />{positive ? '+' : ''}{value}%</span>;
}

export default function TrafficAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<TrafficResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/analytics/traffic?days=${days}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar o tráfego.');
      setData(payload as TrafficResponse);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o tráfego.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const maxDaily = useMemo(() => Math.max(1, ...(data?.summary.daily.map((item) => item.views) ?? [1])), [data]);
  const maxPage = useMemo(() => Math.max(1, ...(data?.summary.topPages.map((item) => item.views) ?? [1])), [data]);

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-[28px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-violet-50 p-6 shadow-sm sm:p-8">
        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-blue-300/25 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/dashboard/analytics" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600"><ArrowLeft className="h-3.5 w-3.5" />Voltar às análises</Link>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Audiência consentida</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Tráfego anônimo do site</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Saiba quantas pessoas visitam a loja sem entrar na conta, quais páginas atraem interesse e de onde elas chegam.</p>
          </div>
          <div className="flex gap-2">
            <select aria-label="Período do tráfego" value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm">
              <option value={1}>24 horas</option><option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option>
            </select>
            <button type="button" onClick={() => void load()} aria-label="Atualizar tráfego" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:text-blue-600"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <p><strong>Privacidade preservada:</strong> só contamos visitantes que aceitaram cookies de análise. Identificadores são irreversivelmente resumidos e nenhum IP ou navegador completo é armazenado.</p>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
      {loading && !data ? <div className="h-72 animate-pulse rounded-3xl bg-slate-100" /> : data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Users} label="Visitantes anônimos" value={String(data.summary.visitors)} note={<Growth value={data.summary.growth.visitors} />} color="bg-blue-50 text-blue-600" />
            <Metric icon={Eye} label="Visualizações" value={String(data.summary.pageViews)} note={<Growth value={data.summary.growth.pageViews} />} color="bg-violet-50 text-violet-600" />
            <Metric icon={Activity} label="Ativos agora" value={String(data.summary.activeNow)} note="últimos 15 minutos" color="bg-emerald-50 text-emerald-600" />
            <Metric icon={MousePointerClick} label="Páginas por sessão" value={data.summary.pagesPerSession.toFixed(2)} note={`${data.summary.bounceRate.toFixed(1)}% saíram na 1ª página`} color="bg-orange-50 text-orange-600" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Evolução diária</h2><p className="mt-1 text-xs text-slate-500">Visualizações dos visitantes sem login.</p></div><Globe2 className="h-5 w-5 text-blue-500" /></div>
              <div className="mt-6 flex h-52 items-end gap-1.5 sm:gap-2">
                {data.summary.daily.map((item) => <div key={item.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><div className="relative w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-violet-400 transition group-hover:brightness-110" style={{ height: `${Math.max(5, item.views / maxDaily * 100)}%` }}><span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-950 px-2 py-1 text-[10px] font-bold text-white group-hover:block">{item.views} acessos</span></div><span className="hidden text-[9px] text-slate-400 sm:block">{new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span></div>)}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-bold text-slate-900">Dispositivos</h2>
              <div className="mt-5 space-y-4">{data.summary.devices.map((item) => { const Icon = item.device === 'mobile' ? Smartphone : item.device === 'tablet' ? Tablet : Laptop; const percent = data.summary.sessions ? item.sessions / data.summary.sessions * 100 : 0; return <div key={item.device}><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 font-semibold text-slate-700"><Icon className="h-4 w-4 text-blue-500" />{DEVICE_LABELS[item.device] ?? item.device}</span><span className="font-bold text-slate-900">{percent.toFixed(0)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${percent}%` }} /></div></div>; })}</div>
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 text-center"><div><p className="text-xl font-black text-slate-900">{data.summary.sessions}</p><p className="text-[10px] uppercase tracking-wide text-slate-400">Sessões</p></div><div><p className="text-xl font-black text-slate-900">{data.summary.returningVisitors}</p><p className="text-[10px] uppercase tracking-wide text-slate-400">Retornaram</p></div></div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <RankedList title="Páginas mais visitadas" icon={Route} items={data.summary.topPages.map((item) => ({ label: pageLabel(item.path), detail: item.path, value: `${item.views} acessos`, amount: item.views }))} max={maxPage} />
            <RankedList title="Origens das visitas" icon={Globe2} items={data.summary.sources.map((item) => ({ label: sourceLabel(item.source), detail: item.source === 'Direto' ? 'Link digitado, favorito ou origem não identificada' : item.source, value: `${item.sessions} sessões`, amount: item.sessions }))} max={Math.max(1, ...data.summary.sources.map((item) => item.sessions))} />
          </div>

          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-bold text-slate-900">Funil dos visitantes sem login</h2><p className="mt-1 text-xs text-slate-500">Sinais de intenção observados apenas pelas páginas acessadas.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Produto → carrinho: {data.summary.funnel.productToCartRate.toFixed(1)}%</span></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[
                { label: 'Viram um produto', value: data.summary.funnel.productSessions, color: 'bg-blue-500' },
                { label: 'Abriram o carrinho', value: data.summary.funnel.cartSessions, color: 'bg-violet-500' },
                { label: 'Concluíram checkout', value: data.summary.funnel.checkoutSessions, color: 'bg-emerald-500' },
                { label: 'Buscaram orçamento 3D', value: data.summary.funnel.printRequestSessions, color: 'bg-orange-500' },
              ].map((item, index) => <div key={item.label} className="relative overflow-hidden rounded-2xl border border-slate-100 p-4"><span className={`absolute inset-y-0 left-0 w-1 ${item.color}`} /><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Etapa {index + 1}</p><p className="mt-2 text-2xl font-black text-slate-950">{item.value}</p><p className="mt-1 text-xs text-slate-500">{item.label}</p></div>)}
            </div>
            <p className="mt-4 text-xs text-slate-500">Do carrinho à confirmação observada: <strong className="text-slate-800">{data.summary.funnel.cartToCheckoutRate.toFixed(1)}%</strong>. Bloqueadores de cookies e pessoas que recusam análise não entram nestes números.</p>
          </section>

          {data.summary.campaigns.length > 0 && <RankedList title="Campanhas UTM" icon={TrendingUp} items={data.summary.campaigns.map((item) => ({ label: item.campaign, detail: 'utm_campaign', value: `${item.sessions} sessões`, amount: item.sessions }))} max={Math.max(1, ...data.summary.campaigns.map((item) => item.sessions))} />}
        </>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, note, color }: { icon: typeof Users; label: string; value: string; note: React.ReactNode; color: string }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></span><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p><div className="mt-1 flex items-end justify-between gap-2"><p className="text-3xl font-black text-slate-950">{value}</p><span className="text-right text-[11px] text-slate-500">{note}</span></div></div>;
}

function RankedList({ title, icon: Icon, items, max }: { title: string; icon: typeof Route; items: Array<{ label: string; detail: string; value: string; amount: number }>; max: number }) {
  return <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><Icon className="h-5 w-5 text-blue-500" /><h2 className="font-bold text-slate-900">{title}</h2></div><div className="mt-5 space-y-4">{items.length ? items.map((item, index) => <div key={`${item.label}-${index}`}><div className="flex items-end justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{index + 1}. {item.label}</p><p className="truncate text-[11px] text-slate-400">{item.detail}</p></div><span className="shrink-0 text-xs font-bold text-slate-600">{item.value}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${Math.max(3, item.amount / max * 100)}%` }} /></div></div>) : <p className="py-8 text-center text-sm text-slate-400">Os dados aparecerão depois dos primeiros acessos consentidos.</p>}</div></section>;
}

function pageLabel(path: string) {
  if (path === '/') return 'Página inicial';
  if (path === '/products') return 'Catálogo de produtos';
  if (path === '/stl') return 'Catálogo de arquivos STL';
  if (path.startsWith('/products/')) return 'Detalhes de produto';
  if (path.startsWith('/stl/')) return 'Detalhes de arquivo STL';
  if (path === '/request-print') return 'Solicitar impressão 3D';
  if (path === '/cart') return 'Carrinho';
  return path;
}

function sourceLabel(source: string) {
  if (source === 'Direto') return 'Acesso direto';
  if (source.includes('google')) return 'Google';
  if (source.includes('instagram')) return 'Instagram';
  if (source.includes('facebook')) return 'Facebook';
  if (source.includes('tiktok')) return 'TikTok';
  return source;
}
