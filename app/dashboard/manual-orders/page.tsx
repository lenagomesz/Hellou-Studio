'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardPlus, Mail, Search, UserRoundCheck, WalletCards } from 'lucide-react';
import { UserAccountPicker, type AccountOption } from '@/components/admin/UserAccountPicker';
import {
  MANUAL_ORDER_PAYMENT_LABELS,
  MANUAL_ORDER_PAYMENT_STATUSES,
  MANUAL_ORDER_STATUS_LABELS,
  MANUAL_ORDER_STATUSES,
} from '@/lib/manual-orders';
import type { ManualOrder, ManualOrderPaymentStatus, ManualOrderStatus } from '@/types/database';

type ManualOrderRow = ManualOrder & { user: { id: string; name: string | null; email: string } | null };

const EMPTY_FORM = {
  customer_name: '', customer_email: '', customer_phone: '', title: '', description: '',
  quantity: '1', total: '', payment_status: 'pending' as ManualOrderPaymentStatus,
  status: 'pending' as ManualOrderStatus, internal_notes: '', send_invite: true,
};

const FIELD_CLASS = 'mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100';

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function ManualOrdersPage() {
  const [orders, setOrders] = useState<ManualOrderRow[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedUser, setSelectedUser] = useState<AccountOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/manual-orders', { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (response.ok) setOrders(result.orders ?? []);
    else setError(result.error ?? 'Erro ao carregar encomendas');
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  function selectUser(user: AccountOption | null) {
    setSelectedUser(user);
    if (user) setForm((current) => ({ ...current, customer_name: user.name || current.customer_name, customer_email: user.email, send_invite: false }));
  }

  async function createOrder(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    const response = await fetch('/api/admin/manual-orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, user_id: selectedUser?.id ?? null, quantity: Number(form.quantity), total: Number(form.total.replace(',', '.')) }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) return setError(result.error ?? 'Erro ao registrar encomenda');
    setForm(EMPTY_FORM); setSelectedUser(null);
    setMessage(result.invite_sent ? 'Encomenda registrada e convite enviado.' : 'Encomenda registrada com sucesso.');
    await load();
  }

  const filtered = useMemo(() => orders.filter((order) => {
    if (statusFilter && order.status !== statusFilter) return false;
    const term = search.trim().toLowerCase();
    return !term || [order.title, order.customer_name, order.customer_email].some((value) => value.toLowerCase().includes(term));
  }), [orders, search, statusFilter]);

  const pendingPayments = orders.filter((order) => order.payment_status === 'pending' && order.status !== 'canceled').length;

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] border border-pink-100 bg-gradient-to-br from-white via-pink-50 to-orange-50 p-6 shadow-sm sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Vendas fora do site</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Vincular encomendas</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Registre pedidos combinados pessoalmente, vincule clientes e controle manualmente pagamento e produção.</p></header>
      {(error || message) && <div role={error ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{error || message}</div>}

      <form onSubmit={createOrder} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-pink-600"><ClipboardPlus className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-900">Nova encomenda externa</h2><p className="text-xs text-slate-500">Primeiro procure uma conta; se não existir, use nome e e-mail normalmente.</p></div></div>
        <div className="mt-5"><UserAccountPicker selected={selectedUser} onSelect={selectUser} /></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Nome do cliente"><input required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className={FIELD_CLASS} /></Field>
          <Field label="E-mail"><input required type="email" value={form.customer_email} readOnly={Boolean(selectedUser)} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className={`${FIELD_CLASS} read-only:bg-slate-50`} /></Field>
          <Field label="Telefone / WhatsApp"><input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className={FIELD_CLASS} /></Field>
          <Field label="Título da encomenda"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={FIELD_CLASS} /></Field>
          <Field label="Quantidade"><input required min="1" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={FIELD_CLASS} /></Field>
          <Field label="Valor total (R$)"><input required min="0" step="0.01" inputMode="decimal" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} className={FIELD_CLASS} /></Field>
          <Field label="Pagamento"><select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value as ManualOrderPaymentStatus })} className={FIELD_CLASS}>{MANUAL_ORDER_PAYMENT_STATUSES.map((value) => <option key={value} value={value}>{MANUAL_ORDER_PAYMENT_LABELS[value]}</option>)}</select></Field>
          <Field label="Andamento"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ManualOrderStatus })} className={FIELD_CLASS}>{MANUAL_ORDER_STATUSES.map((value) => <option key={value} value={value}>{MANUAL_ORDER_STATUS_LABELS[value]}</option>)}</select></Field>
          <Field label="Descrição"><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={FIELD_CLASS} /></Field>
          <div className="md:col-span-2 xl:col-span-3"><Field label="Anotações internas"><textarea rows={3} value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} className={FIELD_CLASS} /></Field></div>
        </div>
        {!selectedUser && <label className="mt-4 flex items-start gap-2 rounded-xl border border-orange-100 bg-orange-50 p-3 text-xs text-orange-900"><input type="checkbox" checked={form.send_invite} onChange={(e) => setForm({ ...form, send_invite: e.target.checked })} className="mt-0.5" /><span><strong>Convidar para criar uma conta</strong><span className="mt-0.5 block text-orange-700">A encomenda continuará sob seu controle mesmo se a pessoa não se cadastrar.</span></span></label>}
        <button disabled={saving} className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-pink-600 disabled:opacity-50">{saving ? 'Registrando...' : 'Registrar encomenda'}</button>
      </form>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-950">Encomendas registradas</h2><p className="text-sm text-slate-500">{orders.length} no total · {pendingPayments} com pagamento pendente</p></div><div className="flex min-w-[280px] flex-1 justify-end gap-2"><div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente ou encomenda" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm" /></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 text-sm"><option value="">Todos</option>{MANUAL_ORDER_STATUSES.map((value) => <option key={value} value={value}>{MANUAL_ORDER_STATUS_LABELS[value]}</option>)}</select></div></div>
        {loading ? <div className="h-32 animate-pulse rounded-2xl bg-slate-100" /> : filtered.length === 0 ? <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-500">Nenhuma encomenda encontrada.</div> : <div className="grid gap-3">{filtered.map((order) => <Link key={order.id} href={`/dashboard/manual-orders/${order.id}`} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-pink-200 hover:shadow-md"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-pink-600">{order.user_id ? <UserRoundCheck className="h-5 w-5" /> : <Mail className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-900">{order.title}</p><p className="truncate text-xs text-slate-500">{order.customer_name} · {order.customer_email}{order.user_id ? ' · conta vinculada' : ' · sem conta'}</p></div><div className="text-right"><p className="font-bold text-slate-900">{money(Number(order.total))}</p><p className={`text-xs font-semibold ${order.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}><WalletCards className="mr-1 inline h-3.5 w-3.5" />{MANUAL_ORDER_PAYMENT_LABELS[order.payment_status]}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{MANUAL_ORDER_STATUS_LABELS[order.status]}</span></Link>)}</div>}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-600">{label}{children}</label>;
}
