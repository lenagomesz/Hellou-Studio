'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, MailPlus, Save, UserRoundCheck } from 'lucide-react';
import { UserAccountPicker, type AccountOption } from '@/components/admin/UserAccountPicker';
import {
  MANUAL_ORDER_PAYMENT_LABELS,
  MANUAL_ORDER_PAYMENT_STATUSES,
  MANUAL_ORDER_STATUS_LABELS,
  MANUAL_ORDER_STATUSES,
} from '@/lib/manual-orders';
import type { ManualOrder, ManualOrderPaymentStatus, ManualOrderStatus } from '@/types/database';

type ManualOrderDetail = ManualOrder & { user: { id: string; name: string | null; email: string } | null };

type EditForm = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  title: string;
  description: string;
  quantity: string;
  total: string;
  payment_status: ManualOrderPaymentStatus;
  status: ManualOrderStatus;
  internal_notes: string;
};

const FIELD_CLASS = 'mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100';

function toForm(order: ManualOrderDetail): EditForm {
  return {
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    customer_phone: order.customer_phone ?? '',
    title: order.title,
    description: order.description ?? '',
    quantity: String(order.quantity),
    total: String(order.total),
    payment_status: order.payment_status,
    status: order.status,
    internal_notes: order.internal_notes ?? '',
  };
}

export default function ManualOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<ManualOrderDetail | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [selectedUser, setSelectedUser] = useState<AccountOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/admin/manual-orders/${params.id}`, { cache: 'no-store' })
      .then(async (response) => ({ response, result: await response.json() }))
      .then(({ response, result }) => {
        if (!response.ok) return setError(result.error ?? 'Erro ao carregar encomenda');
        const loaded = result.order as ManualOrderDetail;
        setOrder(loaded);
        setForm(toForm(loaded));
        setSelectedUser(loaded.user ? { ...loaded.user, role: 'user' } : null);
      })
      .catch(() => setError('Erro ao carregar encomenda'))
      .finally(() => setLoading(false));
  }, [params.id]);

  function selectUser(user: AccountOption | null) {
    setSelectedUser(user);
    if (user && form) setForm({ ...form, customer_name: user.name || form.customer_name, customer_email: user.email });
  }

  async function save(sendInvite = false) {
    if (!form) return;
    setSaving(true); setError(''); setMessage('');
    const response = await fetch(`/api/admin/manual-orders/${params.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        user_id: selectedUser?.id ?? null,
        quantity: Number(form.quantity),
        total: Number(form.total.replace(',', '.')),
        send_invite: sendInvite,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) return setError(result.error ?? 'Erro ao atualizar encomenda');
    const updated = result.order as ManualOrderDetail;
    setOrder(updated); setForm(toForm(updated));
    setSelectedUser(updated.user ? { ...updated.user, role: 'user' } : null);
    setMessage(sendInvite
      ? (result.invite_sent ? 'Alterações salvas e convite enviado.' : 'Alterações salvas, mas o convite não pôde ser enviado.')
      : 'Encomenda atualizada com sucesso.');
  }

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;
  if (!order || !form) return <div className="rounded-2xl border border-red-100 bg-white p-8 text-center"><p className="text-sm text-red-700">{error || 'Encomenda não encontrada.'}</p><Link href="/dashboard/manual-orders" className="mt-4 inline-block text-sm font-bold text-pink-600">Voltar</Link></div>;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/manual-orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-pink-600"><ArrowLeft className="h-4 w-4" />Vincular encomendas</Link>
      <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pink-600">Encomenda externa #{order.id.slice(0, 8).toUpperCase()}</p><h1 className="mt-1 text-3xl font-bold text-slate-950">{order.title}</h1><p className="mt-1 text-sm text-slate-500">Registrada em {new Date(order.created_at).toLocaleString('pt-BR')}</p></div><div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${order.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{MANUAL_ORDER_PAYMENT_LABELS[order.payment_status]}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{MANUAL_ORDER_STATUS_LABELS[order.status]}</span></div></header>
      {(error || message) && <div role={error ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{error || message}</div>}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="space-y-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3"><UserRoundCheck className="h-5 w-5 text-pink-600" /><div><h2 className="font-bold text-slate-900">Cliente vinculado</h2><p className="text-xs text-slate-500">Troque ou vincule uma conta a qualquer momento.</p></div></div>
          <UserAccountPicker selected={selectedUser} onSelect={selectUser} />
          <Field label="Nome"><input required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className={FIELD_CLASS} /></Field>
          <Field label="E-mail"><input required type="email" readOnly={Boolean(selectedUser)} value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className={`${FIELD_CLASS} read-only:bg-slate-50`} /></Field>
          <Field label="Telefone / WhatsApp"><input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className={FIELD_CLASS} /></Field>
          {!selectedUser && <div className="rounded-xl border border-orange-100 bg-orange-50 p-4"><p className="text-xs leading-5 text-orange-800">Este cliente ainda não possui uma conta vinculada.{order.invite_sent_at ? ` Último convite enviado em ${new Date(order.invite_sent_at).toLocaleString('pt-BR')}.` : ''}</p><button type="button" disabled={saving} onClick={() => void save(true)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-orange-800 disabled:opacity-50"><MailPlus className="h-4 w-4" />Enviar convite para criar conta</button></div>}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-bold text-slate-900">Editar encomenda</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Título"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={FIELD_CLASS} /></Field></div>
            <Field label="Quantidade"><input required min="1" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={FIELD_CLASS} /></Field>
            <Field label="Valor total (R$)"><input required min="0" step="0.01" inputMode="decimal" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} className={FIELD_CLASS} /></Field>
            <Field label="Pagamento"><select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value as ManualOrderPaymentStatus })} className={FIELD_CLASS}>{MANUAL_ORDER_PAYMENT_STATUSES.map((value) => <option key={value} value={value}>{MANUAL_ORDER_PAYMENT_LABELS[value]}</option>)}</select></Field>
            <Field label="Andamento"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ManualOrderStatus })} className={FIELD_CLASS}>{MANUAL_ORDER_STATUSES.map((value) => <option key={value} value={value}>{MANUAL_ORDER_STATUS_LABELS[value]}</option>)}</select></Field>
            <div className="sm:col-span-2"><Field label="Descrição"><textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={FIELD_CLASS} /></Field></div>
            <div className="sm:col-span-2"><Field label="Anotações internas"><textarea rows={4} value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} className={FIELD_CLASS} /></Field></div>
          </div>
          <button type="button" disabled={saving} onClick={() => void save(false)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-pink-600 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar todas as alterações'}</button>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-600">{label}{children}</label>;
}
