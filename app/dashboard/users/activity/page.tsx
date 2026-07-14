'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Clock3, Eye, Radio, Route, Users } from 'lucide-react';
import { UserManagementTabs } from '@/components/admin/UserManagementTabs';

type EventItem = {
  id: string;
  event_type: string;
  path: string | null;
  created_at: string;
  user: { id: string; name: string | null; email: string } | Array<{ id: string; name: string | null; email: string }> | null;
};

type ActivityData = {
  events: EventItem[];
  summary: {
    totalEvents: number;
    engagedUsers: number;
    activeNow: number;
    totalCustomers: number;
    topPaths: Array<{ path: string; count: number }>;
    eventTypes: Array<{ type: string; count: number }>;
  };
};

const EVENT_LABELS: Record<string, string> = {
  login: 'Entrou na conta',
  session_start: 'Iniciou uma sessão',
  page_view: 'Visitou uma página',
  product_view: 'Visualizou um produto',
  cart: 'Alterou o carrinho',
  checkout: 'Iniciou o pagamento',
  order: 'Criou um pedido',
  print_request: 'Enviou uma encomenda',
};

function customerOf(event: EventItem) {
  return Array.isArray(event.user) ? event.user[0] : event.user;
}

export default function UserActivityPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const response = await fetch(`/api/admin/user-activity?days=${days}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? 'Não foi possível carregar as atividades');
    else setData(result);
    setLoading(false);
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <UserManagementTabs />

      <header className="relative overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-br from-white via-pink-50 to-orange-50 p-6 shadow-sm sm:p-8">
        <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-pink-300/30 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Comportamento dos clientes</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Atividade dos usuários</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Acompanhe acessos autenticados, páginas visitadas e sinais de intenção de compra, sem registrar senhas ou conteúdo digitado.</p>
          </div>
          <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">
            <option value={1}>Últimas 24 horas</option><option value={7}>Últimos 7 dias</option><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option>
          </select>
        </div>
      </header>

      {error && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}
      {loading ? <div className="h-56 animate-pulse rounded-3xl bg-slate-100" /> : data && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Ativos agora', value: data.summary.activeNow, note: 'Vistos nos últimos 15 minutos', icon: Radio, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Clientes engajados', value: data.summary.engagedUsers, note: `de ${data.summary.totalCustomers} clientes`, icon: Users, color: 'text-blue-600 bg-blue-50' },
            { label: 'Interações', value: data.summary.totalEvents, note: `no período selecionado`, icon: Activity, color: 'text-pink-600 bg-pink-50' },
            { label: 'Páginas acompanhadas', value: data.summary.topPaths.length, note: 'rotas com atividade', icon: Route, color: 'text-violet-600 bg-violet-50' },
          ].map(({ label, value, note, icon: Icon, color }) => <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></span><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-3xl font-bold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div>)}
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Páginas mais visitadas</h2>
            <div className="mt-4 space-y-3">{data.summary.topPaths.map((item, index) => <div key={item.path} className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm text-slate-700">{item.path}</span><span className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-bold text-pink-700">{item.count}</span></div>)}</div>
          </section>
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Linha do tempo recente</h2></div>
            <div className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">{data.events.map((event) => { const customer = customerOf(event); return <div key={event.id} className="flex gap-3 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600"><Eye className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{customer?.name || customer?.email || 'Cliente'}</p><p className="mt-0.5 truncate text-xs text-slate-500">{EVENT_LABELS[event.event_type] ?? event.event_type}{event.path ? ` · ${event.path}` : ''}</p></div><span className="flex shrink-0 items-center gap-1 text-[11px] text-slate-400"><Clock3 className="h-3 w-3" />{new Date(event.created_at).toLocaleString('pt-BR')}</span></div>; })}</div>
          </section>
        </div>
      </>}
    </div>
  );
}
